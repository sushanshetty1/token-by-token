import { CourseNav } from "@/components/shell/CourseNav";

export default function DayLayout({ children }: LayoutProps<"/day">) {
  return (
    <div className="mx-auto flex max-w-[1680px]">
      <CourseNav />
      <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 lg:px-6 lg:py-5">{children}</main>
    </div>
  );
}
