// src/data/questionnaire-hq-v1.ts

/* =============== Types =============== */

/** 모든 문항은 5지선다 단일선택 */
export type FiveChoice = 1 | 2 | 3 | 4 | 5;

/** 타입 라벨(한/영) — 필요 시 code로 분류키도 함께 저장 */
export interface TypeLabel {
  ko: string;  // 한글명
  en: string;  // 영문명
  code?: string; // 선택: 내부 분류키(ex. "disease_history")
}

/** 문항 정의: id, type(라벨쌍), order, title */
export interface QuestionItem {
  id: string;         // 전역 유니크 (예: "Q1")
  type: TypeLabel;    // 한글/영문 라벨 쌍
  order: number;      // 노출 순서
  title: string;      // 질문 텍스트
}

/** 설문 묶음 */
export interface Questionnaire {
  id: string;
  title: string;
  items: QuestionItem[];
}

/** 응답: 문항 id → 1~5 (미응답은 null) */
export type AnswerMap = Record<string, FiveChoice | null>;

/* =============== Utils =============== */

/** order 기준 정렬(원본 불변) */
export const sortByOrder = <T extends { order: number }>(arr: T[]) =>
  [...arr].sort((a, b) => a.order - b.order);

/** 초기 응답 객체 생성 (기본값 null 또는 지정값) */
export const makeInitialAnswers = (
  q: Questionnaire,
  defaultValue: FiveChoice | null = null
): AnswerMap =>
  Object.fromEntries(q.items.map((it) => [it.id, defaultValue])) as AnswerMap;

/** 라벨 헬퍼 */
export const TL = (ko: string, en: string, code?: string): TypeLabel => ({ ko, en, code });

/* =============== Type Labels (예시) =============== */
/** 요청하신 라벨 쌍 */
export const TYPE_DISEASE_HISTORY = TL(
  "질환력 (과거력, 가족력)",
  "Disease history (past history, family history)",
  "disease_history"
);

/* 필요하면 이런 식으로 더 추가해서 사용하세요 */
// export const TYPE_SMOKING = TL("흡연 및 전자담배", "Smoking & e-cigarette", "smoking");
// export const TYPE_ALCOHOL = TL("음주", "Alcohol", "alcohol");
// export const TYPE_LIFESTYLE = TL("생활습관", "Lifestyle", "lifestyle");

/* =============== Data =============== */

export const questionnaire: Questionnaire = {
  id: "hq-v1",
  title: "건강검진 문진표(5지선다)",
  items: sortByOrder<QuestionItem>([
    {
      id: "Q1",
      type: TYPE_DISEASE_HISTORY,
      order: 1,
      title: "최근 2주 수면의 질이 떨어졌다."
    },
    {
      id: "Q2",
      type: TYPE_DISEASE_HISTORY,
      order: 2,
      title: "일상 중 피로감을 자주 느낀다."
    },
    {
      id: "Q3",
      type: TYPE_DISEASE_HISTORY,
      order: 3,
      title: "주 3회 이상 운동한다."
    },
    {
      id: "Q4",
      type: TYPE_DISEASE_HISTORY,
      order: 4,
      title: "당류 섭취를 잘 조절한다."
    },
    {
      id: "Q5",
      type: TYPE_DISEASE_HISTORY,
      order: 5,
      title: "기분 저하로 활동을 줄였다."
    },
  ]),
};

/** 미응답(null)으로 초기화된 응답 객체 */
export const initialAnswers: AnswerMap = makeInitialAnswers(questionnaire);
