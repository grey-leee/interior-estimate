"use client";

import { useMemo, useRef, useState } from "react";

type CategoryId = "wood" | "tile" | "wallpaper" | "paint";

type MaterialItem = {
  id: string;
  name: string;
  spec: string;
  unit: string;
  /** 기본 커버리지: 자재 1단위가 시공할 수 있는 면적(㎡) */
  coverage: number;
  /** true인 경우 카테고리의 coatCount(도장 횟수)를 소요량 계산에 곱한다 */
  usesCoatCount?: boolean;
  /** 사용자가 직접 추가한 자재인지 여부 (이름/규격/단위 편집 및 삭제 가능) */
  isCustom?: boolean;
};

type CategoryConfig = {
  id: CategoryId;
  label: string;
  emoji: string;
  defaultLossRate: number;
  areaLabel: string;
  items: MaterialItem[];
  note: string;
};

const CATEGORIES: CategoryConfig[] = [
  {
    id: "wood",
    label: "목자재",
    emoji: "🪵",
    defaultLossRate: 5,
    areaLabel: "목공 시공면적 (벽 · 천장 구분 입력)",
    note: "몰딩·마감 부자재는 별도 산출이 필요합니다. 로스율은 절단 손실을 감안한 값입니다.",
    items: [
      { id: "gypsum_wall", name: "벽 석고보드 9.5T", spec: "900×1800mm", unit: "장", coverage: 1.62 },
      { id: "gypsum_ceiling", name: "천장 석고보드 9.5T", spec: "900×1800mm", unit: "장", coverage: 1.62 },
      { id: "stud_wall", name: "벽 각재", spec: "30×30×3600mm", unit: "재", coverage: 1.2 },
      { id: "stud_ceiling", name: "천장 각재", spec: "30×30×3600mm", unit: "재", coverage: 1.2 },
      { id: "plywood_wall", name: "벽 합판 4T", spec: "1220×2440mm", unit: "장", coverage: 2.98 },
      { id: "plywood_ceiling", name: "천장 합판 4T", spec: "1220×2440mm", unit: "장", coverage: 2.98 },
    ],
  },
  {
    id: "tile",
    label: "타일자재",
    emoji: "🧱",
    defaultLossRate: 10,
    areaLabel: "타일 시공면적 (벽 · 바닥 구분 입력)",
    note: "절단 손실이 큰 공정이라 로스율을 10% 내외로 넉넉히 설정하는 것을 권장합니다. 압착시멘트·줄눈재는 벽+바닥 합산 면적 기준입니다.",
    items: [
      { id: "tile_wall", name: "벽타일", spec: "300×600mm", unit: "장", coverage: 0.18 },
      { id: "tile_floor", name: "바닥타일", spec: "300×600mm", unit: "장", coverage: 0.18 },
      { id: "adhesive", name: "압착시멘트/본드", spec: "20kg/포", unit: "포", coverage: 5 },
      { id: "grout", name: "줄눈재", spec: "5kg/포", unit: "포", coverage: 10 },
    ],
  },
  {
    id: "wallpaper",
    label: "도배자재",
    emoji: "🖼️",
    defaultLossRate: 10,
    areaLabel: "도배 시공면적 (천장 · 벽 구분 입력)",
    note: "실크벽지는 무늬 맞춤 손실이 커 합지보다 커버리지가 낮게 적용됩니다. 풀·초배지는 천장+벽 합산 면적 기준입니다. 노무비는 로스율을 적용하지 않은 실제 시공 면적(천장+벽) × 단가로 계산됩니다.",
    items: [
      { id: "paper_ceiling", name: "천장벽지", spec: "폭 530mm×10M", unit: "롤", coverage: 4.5 },
      { id: "paper_wall", name: "벽 벽지", spec: "폭 530mm×10M", unit: "롤", coverage: 4.5 },
      { id: "glue", name: "도배용 풀", spec: "25kg/포", unit: "포", coverage: 40 },
      { id: "lining", name: "초배지", spec: "전지", unit: "매", coverage: 3 },
    ],
  },
  {
    id: "paint",
    label: "칠자재",
    emoji: "🎨",
    defaultLossRate: 5,
    areaLabel: "도장 시공면적 (벽 · 천장 구분 입력)",
    note: "페인트 소요량은 도장 횟수만큼 반복 도포되는 것을 감안해 계산됩니다. 퍼티·사포는 벽+천장 합산 면적 기준입니다.",
    items: [
      { id: "paint_wall", name: "벽 페인트", spec: "18L/통", unit: "통", coverage: 4, usesCoatCount: true },
      { id: "paint_ceiling", name: "천장 페인트", spec: "18L/통", unit: "통", coverage: 4, usesCoatCount: true },
      { id: "putty", name: "퍼티(빠데)", spec: "5kg/통", unit: "통", coverage: 10 },
      { id: "sandpaper", name: "사포", spec: "1매", unit: "매", coverage: 5 },
    ],
  },
];

const PAPER_COVERAGE: Record<"합지" | "실크", number> = {
  합지: 4.5,
  실크: 4.0,
};

type CategoryState = {
  area: number;
  lossRate: number;
  coatCount: number;
  ceilingPaperType: "합지" | "실크";
  wallPaperType: "합지" | "실크";
  ceilingRollWidth: number;
  ceilingRollLength: number;
  wallRollWidth: number;
  wallRollLength: number;
  wallpaperCeilingArea: number;
  wallpaperWallArea: number;
  wallpaperLaborRate: number;
  tileModelName: string;
  tilePiecesPerBox: number;
  tileWallArea: number;
  tileFloorArea: number;
  tileWallWidth: number;
  tileWallHeight: number;
  tileFloorWidth: number;
  tileFloorHeight: number;
  paintWallArea: number;
  paintCeilingArea: number;
  woodWallArea: number;
  woodCeilingArea: number;
  coverages: Record<string, number>;
  units: Record<string, string>;
  prices: Record<string, number>;
  customItems: MaterialItem[];
};

const DEFAULT_ROLL_WIDTH_MM = 530;
const DEFAULT_ROLL_LENGTH_M = 10;

function computeRollCoverage(widthMm: number, lengthM: number) {
  if (!widthMm || !lengthM) return 0;
  return Math.round((widthMm / 1000) * lengthM * 100) / 100;
}

const DEFAULT_TILE_WIDTH_MM = 300;
const DEFAULT_TILE_HEIGHT_MM = 600;

function computeTileCoverage(widthMm: number, heightMm: number) {
  if (!widthMm || !heightMm) return 0;
  return Math.round((widthMm / 1000) * (heightMm / 1000) * 10000) / 10000;
}

const WALLPAPER_ITEM_IDS = ["paper_ceiling", "paper_wall"];
const TILE_ITEM_IDS = ["tile_wall", "tile_floor"];

/** 항목별로 산출에 사용할 면적(㎡)을 결정한다. 벽/바닥, 천장/벽처럼 면적이 분리된 항목은
 * 각자의 면적을, 그 외 공용 자재(압착시멘트, 도배용 풀 등)는 합산 면적을 사용한다. */
function getItemArea(config: CategoryConfig, cat: CategoryState, itemId: string) {
  if (config.id === "tile") {
    if (itemId === "tile_wall") return cat.tileWallArea;
    if (itemId === "tile_floor") return cat.tileFloorArea;
    return cat.tileWallArea + cat.tileFloorArea;
  }
  if (config.id === "wallpaper") {
    if (itemId === "paper_ceiling") return cat.wallpaperCeilingArea;
    if (itemId === "paper_wall") return cat.wallpaperWallArea;
    return cat.wallpaperCeilingArea + cat.wallpaperWallArea;
  }
  if (config.id === "paint") {
    if (itemId === "paint_wall") return cat.paintWallArea;
    if (itemId === "paint_ceiling") return cat.paintCeilingArea;
    return cat.paintWallArea + cat.paintCeilingArea;
  }
  if (config.id === "wood") {
    if (itemId.endsWith("_wall")) return cat.woodWallArea;
    if (itemId.endsWith("_ceiling")) return cat.woodCeilingArea;
    return cat.woodWallArea + cat.woodCeilingArea;
  }
  return cat.area;
}

function initialCategoryState(config: CategoryConfig): CategoryState {
  const coverages: Record<string, number> = {};
  const units: Record<string, string> = {};
  const prices: Record<string, number> = {};
  for (const item of config.items) {
    coverages[item.id] = item.coverage;
    units[item.id] = item.unit;
    prices[item.id] = 0;
  }
  if (config.id === "wallpaper") {
    const rollCoverage = computeRollCoverage(DEFAULT_ROLL_WIDTH_MM, DEFAULT_ROLL_LENGTH_M);
    coverages.paper_ceiling = rollCoverage;
    coverages.paper_wall = rollCoverage;
  }
  if (config.id === "tile") {
    const tileCoverage = computeTileCoverage(DEFAULT_TILE_WIDTH_MM, DEFAULT_TILE_HEIGHT_MM);
    coverages.tile_wall = tileCoverage;
    coverages.tile_floor = tileCoverage;
  }
  return {
    area: 0,
    lossRate: config.defaultLossRate,
    coatCount: 2,
    ceilingPaperType: "합지",
    wallPaperType: "합지",
    ceilingRollWidth: DEFAULT_ROLL_WIDTH_MM,
    ceilingRollLength: DEFAULT_ROLL_LENGTH_M,
    wallRollWidth: DEFAULT_ROLL_WIDTH_MM,
    wallRollLength: DEFAULT_ROLL_LENGTH_M,
    wallpaperCeilingArea: 0,
    wallpaperWallArea: 0,
    wallpaperLaborRate: 0,
    tileModelName: "",
    tilePiecesPerBox: 0,
    tileWallArea: 0,
    tileFloorArea: 0,
    tileWallWidth: DEFAULT_TILE_WIDTH_MM,
    tileWallHeight: DEFAULT_TILE_HEIGHT_MM,
    tileFloorWidth: DEFAULT_TILE_WIDTH_MM,
    tileFloorHeight: DEFAULT_TILE_HEIGHT_MM,
    paintWallArea: 0,
    paintCeilingArea: 0,
    woodWallArea: 0,
    woodCeilingArea: 0,
    coverages,
    units,
    prices,
    customItems: [],
  };
}

function initialState(): Record<CategoryId, CategoryState> {
  const state = {} as Record<CategoryId, CategoryState>;
  for (const config of CATEGORIES) {
    state[config.id] = initialCategoryState(config);
  }
  return state;
}

function toPyeong(areaSqm: number) {
  return areaSqm / 3.305785;
}

function computeQuantity(
  areaSqm: number,
  lossRatePercent: number,
  coverage: number,
  multiplier: number
) {
  if (!areaSqm || !coverage || coverage <= 0) return 0;
  const effectiveArea = areaSqm * (1 + lossRatePercent / 100) * multiplier;
  return Math.ceil(effectiveArea / coverage);
}

function formatNumber(value: number, fractionDigits = 0) {
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export default function MaterialEstimateForm() {
  const [state, setState] = useState<Record<CategoryId, CategoryState>>(initialState);
  const [globalArea, setGlobalArea] = useState<number>(0);
  const customIdCounter = useRef(0);

  const updateCategory = (id: CategoryId, patch: Partial<CategoryState>) => {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const updateCoverage = (id: CategoryId, itemId: string, value: number) => {
    setState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        coverages: { ...prev[id].coverages, [itemId]: value },
      },
    }));
  };

  const updateUnit = (id: CategoryId, itemId: string, value: string) => {
    setState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        units: { ...prev[id].units, [itemId]: value },
      },
    }));
  };

  const updatePrice = (id: CategoryId, itemId: string, value: number) => {
    setState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        prices: { ...prev[id].prices, [itemId]: value },
      },
    }));
  };

  const applyGlobalArea = () => {
    setState((prev) => {
      const next = { ...prev };
      for (const config of CATEGORIES) {
        if (config.id === "tile") {
          next[config.id] = {
            ...next[config.id],
            tileWallArea: globalArea,
            tileFloorArea: globalArea,
          };
        } else if (config.id === "wallpaper") {
          next[config.id] = {
            ...next[config.id],
            wallpaperCeilingArea: globalArea,
            wallpaperWallArea: globalArea,
          };
        } else if (config.id === "paint") {
          next[config.id] = {
            ...next[config.id],
            paintWallArea: globalArea,
            paintCeilingArea: globalArea,
          };
        } else {
          next[config.id] = {
            ...next[config.id],
            woodWallArea: globalArea,
            woodCeilingArea: globalArea,
          };
        }
      }
      return next;
    });
  };

  const resetCategory = (config: CategoryConfig) => {
    setState((prev) => ({ ...prev, [config.id]: initialCategoryState(config) }));
  };

  const addCustomItem = (id: CategoryId) => {
    customIdCounter.current += 1;
    const newItem: MaterialItem = {
      id: `custom-${customIdCounter.current}`,
      name: "새 자재",
      spec: "",
      unit: "개",
      coverage: 1,
      isCustom: true,
    };
    setState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        customItems: [...prev[id].customItems, newItem],
        coverages: { ...prev[id].coverages, [newItem.id]: newItem.coverage },
        units: { ...prev[id].units, [newItem.id]: newItem.unit },
        prices: { ...prev[id].prices, [newItem.id]: 0 },
      },
    }));
  };

  const removeCustomItem = (id: CategoryId, itemId: string) => {
    setState((prev) => {
      const restCoverages = { ...prev[id].coverages };
      delete restCoverages[itemId];
      const restUnits = { ...prev[id].units };
      delete restUnits[itemId];
      const restPrices = { ...prev[id].prices };
      delete restPrices[itemId];
      return {
        ...prev,
        [id]: {
          ...prev[id],
          customItems: prev[id].customItems.filter((item) => item.id !== itemId),
          coverages: restCoverages,
          units: restUnits,
          prices: restPrices,
        },
      };
    });
  };

  const updateCustomItemField = (
    id: CategoryId,
    itemId: string,
    field: "name" | "spec",
    value: string
  ) => {
    setState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        customItems: prev[id].customItems.map((item) =>
          item.id === itemId ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const toggleCustomItemCoatCount = (id: CategoryId, itemId: string, checked: boolean) => {
    setState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        customItems: prev[id].customItems.map((item) =>
          item.id === itemId ? { ...item, usesCoatCount: checked } : item
        ),
      },
    }));
  };

  const results = useMemo(() => {
    const byCategory: Record<
      CategoryId,
      {
        item: MaterialItem;
        quantity: number;
        coverage: number;
        unit: string;
        price: number;
        amount: number;
      }[]
    > = {} as never;
    for (const config of CATEGORIES) {
      const cat = state[config.id];
      const allItems = [...config.items, ...cat.customItems];
      byCategory[config.id] = allItems.map((item) => {
        const fallbackPaperType = item.id === "paper_ceiling" ? cat.ceilingPaperType : cat.wallPaperType;
        const coverage = WALLPAPER_ITEM_IDS.includes(item.id)
          ? cat.coverages[item.id] ?? PAPER_COVERAGE[fallbackPaperType]
          : cat.coverages[item.id] ?? item.coverage;
        const unit = cat.units[item.id] ?? item.unit;
        const multiplier = item.usesCoatCount ? cat.coatCount : 1;
        const area = getItemArea(config, cat, item.id);
        const quantity = computeQuantity(area, cat.lossRate, coverage, multiplier);
        const price = cat.prices[item.id] ?? 0;
        return {
          item,
          coverage,
          unit,
          quantity,
          price,
          amount: quantity * price,
        };
      });
    }
    return byCategory;
  }, [state]);

  const wallpaperLaborCost = useMemo(() => {
    const cat = state.wallpaper;
    const area = cat.wallpaperCeilingArea + cat.wallpaperWallArea;
    return area * cat.wallpaperLaborRate;
  }, [state.wallpaper]);

  const categoryTotals = useMemo(() => {
    const totals = {} as Record<CategoryId, number>;
    for (const config of CATEGORIES) {
      const materialTotal = results[config.id].reduce((sum, r) => sum + r.amount, 0);
      totals[config.id] =
        config.id === "wallpaper" ? materialTotal + wallpaperLaborCost : materialTotal;
    }
    return totals;
  }, [results, wallpaperLaborCost]);

  const grandTotal = useMemo(
    () => CATEGORIES.reduce((sum, config) => sum + categoryTotals[config.id], 0),
    [categoryTotals]
  );

  return (
    <div className="flex w-full flex-col gap-8">
      <section className="rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.12] dark:bg-[#111111]">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          빠른 입력
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          하나의 면적을 아래 네 개 공정에 한 번에 적용하고, 각 공정별로 세부 값을
          다시 조정할 수 있습니다.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              공통 면적 (㎡)
            </span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={globalArea || ""}
              onChange={(e) => setGlobalArea(Number(e.target.value) || 0)}
              placeholder="예: 82.5"
              className="w-40 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
            />
          </label>
          <span className="pb-2 text-xs text-zinc-500 dark:text-zinc-400">
            약 {formatNumber(toPyeong(globalArea), 1)}평
          </span>
          <button
            type="button"
            onClick={applyGlobalArea}
            className="h-9 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#cccccc]"
          >
            전체 항목에 적용
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.12] dark:bg-[#111111]">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          전체 합계 금액
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          각 공정에서 입력한 단가 × 산출 수량을 모두 더한 금액입니다.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((config) => (
            <div
              key={config.id}
              className="rounded-xl border border-black/[.06] px-3 py-2 dark:border-white/[.1]"
            >
              <dt className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                <span aria-hidden>{config.emoji}</span>
                {config.label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {formatNumber(categoryTotals[config.id])}원
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex items-baseline justify-between border-t border-black/[.08] pt-4 dark:border-white/[.12]">
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            총 합계
          </span>
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {formatNumber(grandTotal)}원
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {CATEGORIES.map((config) => {
          const cat = state[config.id];
          const items = results[config.id];
          return (
            <section
              key={config.id}
              className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.12] dark:bg-[#111111]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    <span aria-hidden>{config.emoji}</span>
                    {config.label}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {config.areaLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resetCategory(config)}
                  className="text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-700 hover:underline dark:text-zinc-500 dark:hover:text-zinc-200"
                >
                  초기화
                </button>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                {config.id === "tile" ? (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        벽 면적 (㎡)
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={cat.tileWallArea || ""}
                        onChange={(e) =>
                          updateCategory(config.id, {
                            tileWallArea: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        className="w-24 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        바닥 면적 (㎡)
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={cat.tileFloorArea || ""}
                        onChange={(e) =>
                          updateCategory(config.id, {
                            tileFloorArea: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        className="w-24 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                      />
                    </label>
                    <span className="pb-2 text-xs text-zinc-500 dark:text-zinc-400">
                      합계 {formatNumber(cat.tileWallArea + cat.tileFloorArea, 1)}㎡ · 약{" "}
                      {formatNumber(toPyeong(cat.tileWallArea + cat.tileFloorArea), 1)}평
                    </span>
                  </>
                ) : config.id === "wallpaper" ? (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        천장 면적 (㎡)
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={cat.wallpaperCeilingArea || ""}
                        onChange={(e) =>
                          updateCategory(config.id, {
                            wallpaperCeilingArea: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        className="w-24 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        벽 면적 (㎡)
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={cat.wallpaperWallArea || ""}
                        onChange={(e) =>
                          updateCategory(config.id, {
                            wallpaperWallArea: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        className="w-24 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                      />
                    </label>
                    <span className="pb-2 text-xs text-zinc-500 dark:text-zinc-400">
                      합계 {formatNumber(cat.wallpaperCeilingArea + cat.wallpaperWallArea, 1)}㎡ ·
                      약 {formatNumber(toPyeong(cat.wallpaperCeilingArea + cat.wallpaperWallArea), 1)}평
                    </span>
                  </>
                ) : config.id === "paint" ? (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        벽 면적 (㎡)
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={cat.paintWallArea || ""}
                        onChange={(e) =>
                          updateCategory(config.id, {
                            paintWallArea: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        className="w-24 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        천장 면적 (㎡)
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={cat.paintCeilingArea || ""}
                        onChange={(e) =>
                          updateCategory(config.id, {
                            paintCeilingArea: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        className="w-24 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                      />
                    </label>
                    <span className="pb-2 text-xs text-zinc-500 dark:text-zinc-400">
                      합계 {formatNumber(cat.paintWallArea + cat.paintCeilingArea, 1)}㎡ · 약{" "}
                      {formatNumber(toPyeong(cat.paintWallArea + cat.paintCeilingArea), 1)}평
                    </span>
                  </>
                ) : (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        벽 면적 (㎡)
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={cat.woodWallArea || ""}
                        onChange={(e) =>
                          updateCategory(config.id, {
                            woodWallArea: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        className="w-24 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        천장 면적 (㎡)
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={cat.woodCeilingArea || ""}
                        onChange={(e) =>
                          updateCategory(config.id, {
                            woodCeilingArea: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        className="w-24 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                      />
                    </label>
                    <span className="pb-2 text-xs text-zinc-500 dark:text-zinc-400">
                      합계 {formatNumber(cat.woodWallArea + cat.woodCeilingArea, 1)}㎡ · 약{" "}
                      {formatNumber(toPyeong(cat.woodWallArea + cat.woodCeilingArea), 1)}평
                    </span>
                  </>
                )}
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    로스율 (%)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={cat.lossRate}
                    onChange={(e) =>
                      updateCategory(config.id, { lossRate: Number(e.target.value) || 0 })
                    }
                    className="w-20 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                  />
                </label>

                {config.id === "wallpaper" && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      노무비 단가 (원/㎡)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={cat.wallpaperLaborRate || ""}
                      onChange={(e) =>
                        updateCategory(config.id, {
                          wallpaperLaborRate: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="예: 8000"
                      className="w-28 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                    />
                  </label>
                )}

                {config.id === "paint" && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      도장 횟수
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={cat.coatCount}
                      onChange={(e) =>
                        updateCategory(config.id, {
                          coatCount: Number(e.target.value) || 1,
                        })
                      }
                      className="w-20 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                    />
                  </label>
                )}

                {config.id === "tile" && (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        타일 모델명
                      </span>
                      <input
                        type="text"
                        value={cat.tileModelName}
                        onChange={(e) =>
                          updateCategory(config.id, { tileModelName: e.target.value })
                        }
                        placeholder="예: OOO타일 AB-123"
                        className="w-40 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        박스당 매수 (장)
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={cat.tilePiecesPerBox || ""}
                        onChange={(e) =>
                          updateCategory(config.id, {
                            tilePiecesPerBox: Number(e.target.value) || 0,
                          })
                        }
                        placeholder="예: 10"
                        className="w-24 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                      />
                    </label>
                  </>
                )}
              </div>

              {config.id === "tile" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(
                    [
                      {
                        key: "wall" as const,
                        label: "벽타일",
                        width: cat.tileWallWidth,
                        height: cat.tileWallHeight,
                        itemId: "tile_wall",
                      },
                      {
                        key: "floor" as const,
                        label: "바닥타일",
                        width: cat.tileFloorWidth,
                        height: cat.tileFloorHeight,
                        itemId: "tile_floor",
                      },
                    ] as const
                  ).map((surface) => (
                    <div
                      key={surface.key}
                      className="flex flex-col gap-3 rounded-xl border border-black/[.06] p-3 dark:border-white/[.1]"
                    >
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        {surface.label} 사이즈
                      </span>
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            가로 (mm)
                          </span>
                          <input
                            type="number"
                            min={0}
                            step={10}
                            value={surface.width || ""}
                            onChange={(e) => {
                              const width = Number(e.target.value) || 0;
                              const nextCoverage = computeTileCoverage(width, surface.height);
                              updateCategory(config.id, {
                                ...(surface.key === "wall"
                                  ? { tileWallWidth: width }
                                  : { tileFloorWidth: width }),
                                coverages: {
                                  ...cat.coverages,
                                  [surface.itemId]: nextCoverage,
                                },
                              });
                            }}
                            className="w-24 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            세로 (mm)
                          </span>
                          <input
                            type="number"
                            min={0}
                            step={10}
                            value={surface.height || ""}
                            onChange={(e) => {
                              const height = Number(e.target.value) || 0;
                              const nextCoverage = computeTileCoverage(surface.width, height);
                              updateCategory(config.id, {
                                ...(surface.key === "wall"
                                  ? { tileWallHeight: height }
                                  : { tileFloorHeight: height }),
                                coverages: {
                                  ...cat.coverages,
                                  [surface.itemId]: nextCoverage,
                                },
                              });
                            }}
                            className="w-24 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                          />
                        </label>
                        <span className="pb-2 text-xs text-zinc-500 dark:text-zinc-400">
                          = {formatNumber(computeTileCoverage(surface.width, surface.height), 4)}
                          ㎡/장
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {config.id === "wallpaper" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(
                    [
                      {
                        key: "ceiling" as const,
                        label: "천장 벽지",
                        paperType: cat.ceilingPaperType,
                        rollWidth: cat.ceilingRollWidth,
                        rollLength: cat.ceilingRollLength,
                        itemId: "paper_ceiling",
                      },
                      {
                        key: "wall" as const,
                        label: "벽 벽지",
                        paperType: cat.wallPaperType,
                        rollWidth: cat.wallRollWidth,
                        rollLength: cat.wallRollLength,
                        itemId: "paper_wall",
                      },
                    ] as const
                  ).map((surface) => (
                    <div
                      key={surface.key}
                      className="flex flex-col gap-3 rounded-xl border border-black/[.06] p-3 dark:border-white/[.1]"
                    >
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        {surface.label} 종류 · 사이즈
                      </span>
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            벽지 종류
                          </span>
                          <select
                            value={surface.paperType}
                            onChange={(e) => {
                              const paperType = e.target.value as "합지" | "실크";
                              updateCategory(config.id, {
                                ...(surface.key === "ceiling"
                                  ? { ceilingPaperType: paperType }
                                  : { wallPaperType: paperType }),
                                coverages: {
                                  ...cat.coverages,
                                  [surface.itemId]: PAPER_COVERAGE[paperType],
                                },
                              });
                            }}
                            className="h-[38px] rounded-lg border border-black/[.12] bg-transparent px-3 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                          >
                            <option value="합지">합지벽지</option>
                            <option value="실크">실크벽지</option>
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            롤 폭 (mm)
                          </span>
                          <input
                            type="number"
                            min={0}
                            step={10}
                            value={surface.rollWidth || ""}
                            onChange={(e) => {
                              const width = Number(e.target.value) || 0;
                              const nextCoverage = computeRollCoverage(
                                width,
                                surface.rollLength
                              );
                              updateCategory(config.id, {
                                ...(surface.key === "ceiling"
                                  ? { ceilingRollWidth: width }
                                  : { wallRollWidth: width }),
                                coverages: {
                                  ...cat.coverages,
                                  [surface.itemId]: nextCoverage,
                                },
                              });
                            }}
                            className="w-24 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            롤 길이 (m)
                          </span>
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={surface.rollLength || ""}
                            onChange={(e) => {
                              const length = Number(e.target.value) || 0;
                              const nextCoverage = computeRollCoverage(
                                surface.rollWidth,
                                length
                              );
                              updateCategory(config.id, {
                                ...(surface.key === "ceiling"
                                  ? { ceilingRollLength: length }
                                  : { wallRollLength: length }),
                                coverages: {
                                  ...cat.coverages,
                                  [surface.itemId]: nextCoverage,
                                },
                              });
                            }}
                            className="w-24 rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                          />
                        </label>
                        <span className="pb-2 text-xs text-zinc-500 dark:text-zinc-400">
                          = {formatNumber(
                            computeRollCoverage(surface.rollWidth, surface.rollLength),
                            2
                          )}
                          ㎡/롤
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-black/[.08] text-left text-xs text-zinc-500 dark:border-white/[.12] dark:text-zinc-400">
                      <th className="py-2 pr-2 font-medium">자재명</th>
                      <th className="py-2 pr-2 font-medium">단위</th>
                      <th className="py-2 pr-2 font-medium">
                        커버리지
                        <br />
                        (㎡/단위)
                      </th>
                      <th className="py-2 pr-2 text-right font-medium">산출 수량</th>
                      <th className="py-2 pr-2 text-right font-medium">단가 (원)</th>
                      <th className="py-2 pl-2 text-right font-medium">금액 (원)</th>
                      <th className="w-8 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(({ item, coverage, unit, quantity, price, amount }) => (
                      <tr
                        key={item.id}
                        className="border-b border-black/[.04] last:border-none dark:border-white/[.06]"
                      >
                        <td className="py-2 pr-2">
                          {item.isCustom ? (
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) =>
                                  updateCustomItemField(
                                    config.id,
                                    item.id,
                                    "name",
                                    e.target.value
                                  )
                                }
                                placeholder="자재명"
                                className="w-32 rounded-lg border border-black/[.12] bg-transparent px-2 py-1 text-sm font-medium outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                              />
                              <input
                                type="text"
                                value={item.spec}
                                onChange={(e) =>
                                  updateCustomItemField(
                                    config.id,
                                    item.id,
                                    "spec",
                                    e.target.value
                                  )
                                }
                                placeholder="규격 (선택)"
                                className="w-32 rounded-lg border border-black/[.12] bg-transparent px-2 py-1 text-xs outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                              />
                              {config.id === "paint" && (
                                <label className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                  <input
                                    type="checkbox"
                                    checked={item.usesCoatCount ?? false}
                                    onChange={(e) =>
                                      toggleCustomItemCoatCount(
                                        config.id,
                                        item.id,
                                        e.target.checked
                                      )
                                    }
                                  />
                                  도장 횟수 반영
                                </label>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                {item.name}
                              </div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                {config.id === "wallpaper" && item.id === "paper_ceiling"
                                  ? `폭 ${formatNumber(cat.ceilingRollWidth)}mm×${formatNumber(cat.ceilingRollLength, 1)}M`
                                  : config.id === "wallpaper" && item.id === "paper_wall"
                                  ? `폭 ${formatNumber(cat.wallRollWidth)}mm×${formatNumber(cat.wallRollLength, 1)}M`
                                  : config.id === "tile" && item.id === "tile_wall"
                                  ? `${formatNumber(cat.tileWallWidth)}×${formatNumber(cat.tileWallHeight)}mm`
                                  : config.id === "tile" && item.id === "tile_floor"
                                  ? `${formatNumber(cat.tileFloorWidth)}×${formatNumber(cat.tileFloorHeight)}mm`
                                  : item.spec}
                              </div>
                              {config.id === "tile" &&
                                TILE_ITEM_IDS.includes(item.id) &&
                                cat.tileModelName && (
                                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                    모델명: {cat.tileModelName}
                                  </div>
                                )}
                            </>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-zinc-600 dark:text-zinc-400">
                          <input
                            type="text"
                            value={unit}
                            onChange={(e) => updateUnit(config.id, item.id, e.target.value)}
                            className="w-14 rounded-lg border border-black/[.12] bg-transparent px-2 py-1 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={coverage}
                            onChange={(e) =>
                              updateCoverage(
                                config.id,
                                item.id,
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-20 rounded-lg border border-black/[.12] bg-transparent px-2 py-1 text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                          />
                        </td>
                        <td className="py-2 pr-2 text-right">
                          <div>
                            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                              {formatNumber(quantity)}
                            </span>{" "}
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {unit}
                            </span>
                          </div>
                          {config.id === "tile" &&
                            TILE_ITEM_IDS.includes(item.id) &&
                            cat.tilePiecesPerBox > 0 && (
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                약 {formatNumber(Math.ceil(quantity / cat.tilePiecesPerBox))}박스
                              </div>
                            )}
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min={0}
                            step={10}
                            value={price || ""}
                            onChange={(e) =>
                              updatePrice(config.id, item.id, Number(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="w-24 rounded-lg border border-black/[.12] bg-transparent px-2 py-1 text-right text-sm outline-none focus:border-zinc-900 dark:border-white/[.16] dark:focus:border-zinc-100"
                          />
                        </td>
                        <td className="py-2 pl-2 text-right">
                          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatNumber(amount)}
                          </span>
                        </td>
                        <td className="py-2 pl-1 text-right align-top">
                          {item.isCustom && (
                            <button
                              type="button"
                              onClick={() => removeCustomItem(config.id, item.id)}
                              aria-label="자재 삭제"
                              className="text-zinc-400 hover:text-red-500"
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {config.id === "wallpaper" && (
                      <tr className="border-t border-black/[.08] dark:border-white/[.12]">
                        <td
                          colSpan={5}
                          className="py-2 pr-2 text-right text-sm text-zinc-500 dark:text-zinc-400"
                        >
                          노무비 (
                          {formatNumber(cat.wallpaperCeilingArea + cat.wallpaperWallArea, 1)}㎡ ×{" "}
                          {formatNumber(cat.wallpaperLaborRate)}원/㎡)
                        </td>
                        <td className="py-2 pl-2 text-right text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {formatNumber(wallpaperLaborCost)}원
                        </td>
                        <td />
                      </tr>
                    )}
                    <tr className="border-t border-black/[.08] dark:border-white/[.12]">
                      <td colSpan={5} className="py-2 pr-2 text-right text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        공정 합계
                      </td>
                      <td className="py-2 pl-2 text-right text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {formatNumber(categoryTotals[config.id])}원
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <button
                type="button"
                onClick={() => addCustomItem(config.id)}
                className="self-start rounded-full border border-dashed border-black/[.16] px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:border-white/[.2] dark:text-zinc-400 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
              >
                + 자재 추가
              </button>

              <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                {config.note}
              </p>
            </section>
          );
        })}
      </div>

      <p className="text-xs leading-5 text-zinc-400 dark:text-zinc-500">
        ※ 위 산출값은 입력한 커버리지(단위당 시공 면적) 기준의 개략 추정치이며,
        실제 발주 수량은 현장 실측·자재 규격에 따라 달라질 수 있습니다.
      </p>
    </div>
  );
}
