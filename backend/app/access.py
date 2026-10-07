from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import and_, false, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import RFI, User, Workspace

"""
Visibility rules
- A workspace is visible to its owner; to members of the owner's organisation when visibility == "org";
  and, for legacy workspaces with no owner, to admins.
- An RFI inside a workspace follows the workspace. An RFI outside any workspace is visible to its owner
  (or to admins when it has no owner).
Queries that use these clauses must outer-join Workspace on RFI.workspace_id.
"""


def workspace_visible_clause(user: User):
    clauses = [Workspace.owner_id == user.id]
    if user.org_id is not None:
        clauses.append(
            and_(Workspace.visibility == "org", Workspace.org_id.is_not(None), Workspace.org_id == user.org_id)
        )
    if user.is_admin:
        clauses.append(Workspace.owner_id.is_(None))
    return or_(*clauses)


def rfi_visible_clause(user: User):
    unowned = and_(RFI.owner_id.is_(None), true() if user.is_admin else false())
    return or_(
        and_(RFI.workspace_id.is_not(None), workspace_visible_clause(user)),
        and_(RFI.workspace_id.is_(None), or_(RFI.owner_id == user.id, unowned)),
    )


async def get_accessible_workspace(db: AsyncSession, user: User, ws_id: UUID) -> Workspace:
    ws = (
        await db.execute(select(Workspace).where(Workspace.id == ws_id, workspace_visible_clause(user)))
    ).scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


async def get_accessible_rfi(db: AsyncSession, user: User, rfi_id: UUID, with_responses: bool = False) -> RFI:
    query = (
        select(RFI)
        .outerjoin(Workspace, RFI.workspace_id == Workspace.id)
        .where(RFI.id == rfi_id, rfi_visible_clause(user))
    )
    if with_responses:
        query = query.options(selectinload(RFI.responses))
    rfi = (await db.execute(query)).scalar_one_or_none()
    if not rfi:
        raise HTTPException(status_code=404, detail="RFI not found")
    return rfi
