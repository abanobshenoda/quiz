"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getQuestions(categoryId?: string) {
  try {
    const questions = await prisma.question.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        category: {
          select: { id: true, name: true, pointsPerQuestion: true, color: true },
        },
      },
    });
    return { success: true, data: questions };
  } catch (error) {
    console.error("Error fetching questions:", error);
    return { success: false, error: "حدث خطأ أثناء جلب الأسئلة" };
  }
}

export async function createQuestion(formData: FormData) {
  try {
    const categoryId = formData.get("categoryId") as string;
    const text = formData.get("text") as string;
    const type = formData.get("type") as string;
    const rawOptions = formData.get("options") as string;
    const rawAnswer = formData.get("answer") as string;
    
    if (!categoryId || !text || !type || !rawAnswer) {
      return { success: false, error: "جميع الحقول الأساسية مطلوبة" };
    }

    let options: string[] = [];
    const answer = rawAnswer;

    if (type === "MULTIPLE_CHOICE") {
      if (!rawOptions) {
        return { success: false, error: "يجب تحديد الخيارات لأسئلة الاختيار من متعدد" };
      }
      options = JSON.parse(rawOptions);
      if (options.length < 2) {
        return { success: false, error: "يجب تحديد خيارين على الأقل" };
      }
      if (!options.includes(answer)) {
        return { success: false, error: "الإجابة الصحيحة غير موجودة ضمن الخيارات" };
      }
    }

    const question = await prisma.question.create({
      data: {
        categoryId,
        text,
        type,
        options,
        answer,
      },
      include: {
        category: true,
      },
    });

    revalidatePath("/home/questions");
    revalidatePath("/home/categories"); // Count updates
    return { success: true, data: question };
  } catch (error) {
    console.error("Error creating question:", error);
    return { success: false, error: "حدث خطأ أثناء حفظ السؤال" };
  }
}

export async function deleteQuestion(id: string) {
  try {
    if (!id) return { success: false, error: "معرف السؤال مفقود" };

    await prisma.question.delete({
      where: { id },
    });

    revalidatePath("/home/questions");
    revalidatePath("/home/categories");
    return { success: true };
  } catch (error) {
    console.error("Error deleting question:", error);
    return { success: false, error: "حدث خطأ أثناء حذف السؤال" };
  }
}

export async function updateQuestion(id: string, formData: FormData) {
  try {
    if (!id) return { success: false, error: "معرف السؤال مفقود" };

    const categoryId = formData.get("categoryId") as string;
    const text = formData.get("text") as string;
    const type = formData.get("type") as string;
    const rawOptions = formData.get("options") as string;
    const rawAnswer = formData.get("answer") as string;

    if (!categoryId || !text || !type || !rawAnswer) {
      return { success: false, error: "جميع الحقول الأساسية مطلوبة" };
    }

    let options: string[] = [];
    const answer = rawAnswer;

    if (type === "MULTIPLE_CHOICE") {
      if (!rawOptions) {
        return { success: false, error: "يجب تحديد الخيارات لأسئلة الاختيار من متعدد" };
      }
      options = JSON.parse(rawOptions);
      if (options.length < 2) {
        return { success: false, error: "يجب تحديد خيارين على الأقل" };
      }
      if (!options.includes(answer)) {
        return { success: false, error: "الإجابة الصحيحة غير موجودة ضمن الخيارات" };
      }
    }

    const question = await prisma.question.update({
      where: { id },
      data: {
        categoryId,
        text,
        type,
        options,
        answer,
      },
      include: {
        category: true,
      },
    });

    revalidatePath("/home/questions");
    revalidatePath("/home/categories");
    return { success: true, data: question };
  } catch (error) {
    console.error("Error updating question:", error);
    return { success: false, error: "حدث خطأ أثناء تعديل السؤال" };
  }
}
