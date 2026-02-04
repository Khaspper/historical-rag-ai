import { NextResponse } from "next/server";

/**
 * Stub: DELETE /api/file/:id - no-op success.
 * Replace with real delete logic later.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  void id; // Stub: no-op; implement actual delete later
  return new NextResponse(null, { status: 204 });
}
