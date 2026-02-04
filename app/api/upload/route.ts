import { NextResponse } from "next/server";

/**
 * Stub: accept multipart form-data and return a mock file id.
 * Replace with real upload logic later.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file" },
        { status: 400 }
      );
    }
    const allowed = [
      "application/pdf",
      "text/markdown",
      "text/x-markdown",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowedExt = [".pdf", ".md", ".markdown"].includes(`.${ext}`);
    if (!allowed.includes(file.type) && !allowedExt) {
      return NextResponse.json(
        { error: "Only PDF and Markdown files are allowed." },
        { status: 400 }
      );
    }
    const id = `stub-${Date.now()}-${file.name}`;
    return NextResponse.json({ id });
  } catch {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
