import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Stub: accept multipart form-data and return a mock file id.
 * Replace with real upload logic later.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    // const supabaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL;

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

    const filePath = `${userId}/${file.name}`

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file, { contentType: file.type })

    if (uploadError?.status === 409) {
      return NextResponse.json({ ok: false, message: 'File already exists', status: 409 });
    }

    if (uploadError) {
      console.error('Upload Error: ', uploadError)
      throw uploadError
    }

    const payload = { filePath, fileType: file.type }

    const { data: response, error } = await supabase.functions.invoke('ingest_document', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: payload
    })

    console.log('response', response)

    if (error) {
      return NextResponse.json({ error });
    }

    return NextResponse.json({ ok: true, message: 'Success', status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
