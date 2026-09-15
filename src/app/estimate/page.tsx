import type { Metadata } from "next";
import Link from "next/link";
import MaterialEstimateForm from "@/components/MaterialEstimateForm";

export const metadata: Metadata = {
  title: "인테리어 물량 산출",
  description: "면적을 입력해 목자재·타일자재·도배자재·칠자재 물량을 자동 산출합니다.",
};

export default function EstimatePage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-10 dark:bg-black sm:px-8">
      <div className="flex w-full max-w-4xl flex-col gap-6">
        <div>
          <Link
            href="/"
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← 홈으로
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            인테리어 공정 물량 자동 산출
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            목자재·타일자재·도배자재·칠자재의 시공 면적을 입력하면 필요한 자재
            수량을 자동으로 계산합니다.
          </p>
        </div>
        <MaterialEstimateForm />
      </div>
    </div>
  );
}
