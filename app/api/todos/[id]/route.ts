import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isNonEmptyString } from "@/lib/validation";

// Зөвхөн өөрийн todo-г өөрчлөх/устгах боломжтой
async function findOwnTodo(req: NextRequest, id: string) {
  const userName = req.headers.get("x-user-name");
  if (!userName) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const todoId = parseInt(id);
  if (isNaN(todoId)) {
    return { error: NextResponse.json({ error: "Буруу ID байна" }, { status: 400 }) };
  }

  const todo = await prisma.todo.findUnique({ where: { id: todoId } });
  if (!todo || todo.userName !== userName) {
    return { error: NextResponse.json({ error: "Олдсонгүй" }, { status: 404 }) };
  }

  return { todoId };
}

// Next.js 15+ дээр params нь Promise байдаг тул заавал await хийнэ
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const found = await findOwnTodo(req, id);
    if (found.error) return found.error;

    const body = await req.json();
    const data: { completed?: boolean; task?: string } = {};

    if (typeof body?.completed === "boolean") {
      data.completed = body.completed;
    }
    if (body?.task !== undefined) {
      if (!isNonEmptyString(body.task)) {
        return NextResponse.json({ error: "task хоосон байж болохгүй" }, { status: 400 });
      }
      data.task = body.task.trim();
    }

    const updatedTodo = await prisma.todo.update({
      where: { id: found.todoId },
      data,
    });

    return NextResponse.json(updatedTodo);
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: "Серверийн алдаа" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const found = await findOwnTodo(req, id);
    if (found.error) return found.error;

    await prisma.todo.delete({
      where: { id: found.todoId },
    });

    return NextResponse.json({ message: "Устгагдлаа" });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: "Устгахад алдаа гарлаа" },
      { status: 500 },
    );
  }
}
