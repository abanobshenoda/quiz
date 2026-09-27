"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });
    return { success: true, data: categories };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { success: false, error: "حدث خطأ أثناء جلب الفئات" };
  }
}

export async function createCategory(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const pointsStr = formData.get("pointsPerQuestion") as string;
    const color = (formData.get("color") as string) || "blue";
    
    if (!name || !pointsStr) {
      return { success: false, error: "جميع الحقول مطلوبة" };
    }

    const pointsPerQuestion = parseInt(pointsStr, 10);
    if (isNaN(pointsPerQuestion) || pointsPerQuestion <= 0) {
      return { success: false, error: "يجب تحديد عدد نقاط صحيح لكل سؤال" };
    }

    const category = await prisma.category.create({
      data: {
        name,
        pointsPerQuestion,
        color,
      },
    });

    revalidatePath("/home/categories");
    return { success: true, data: category };
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false, error: "حدث خطأ أثناء حفظ الفئة" };
  }
}

export async function deleteCategory(id: string) {
  try {
    if (!id) return { success: false, error: "معرف الفئة مفقود" };

    await prisma.category.delete({
      where: { id },
    });

    revalidatePath("/home/categories");
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: "حدث خطأ أثناء حذف الفئة" };
  }
}
