import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Stub: accept multipart form-data and return a mock file id.
 * Replace with real upload logic later.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()

    if (getUserError) {
      console.log('getUserError: ', getUserError)
      return NextResponse.json(
        { error: "Only auth users allowed." },
        { status: 403 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 400 }
      );
    }

    const userId = user.id

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

    console.log('request: ', file)
    console.log('request: ', userId)

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(`${userId}/${file.name}`, file, { contentType: file.type })

    if (uploadError?.status === 409) {
      return NextResponse.json({ ok: false, message: 'File already exists', status: 409 });
    }

    if (uploadError) {
      console.error('Upload Error: ', uploadError)
      throw uploadError
    }
    return NextResponse.json({ ok: true, message: 'Success', status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
