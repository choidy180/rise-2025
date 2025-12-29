// data/checkupQuestions.ts

export type AnswerType = "scale" | "yesno" | "select";

export interface AnswerOption_REMAKE {
  value: number;
  label: string;
  // 이 답변을 선택한 것으로 간주할 음성 키워드 목록
  keywords?: string[]; 
}

export interface CheckupQuestion {
  id: number;
  category: string;
  type: AnswerType;
  question: string;
  options: AnswerOption_REMAKE[]; 
  dependency?: {
    targetId: number;
    answerValue: number | number[]; 
  };
  isReverse?: boolean;
}

/* ============================================================
  공통 키워드 그룹 (재사용성을 위해 정의)
  - STT(음성인식)가 오인식할 수 있는 발음까지 포함
   ============================================================ */

const KW_NO_BASE = [
  "아니", "아뇨", "아니요", "아닝", "아니라", "아닙", "노", "no", 
  "없", "안해", "안 해", "안먹", "안 먹", "안받", "안 받", 
  "전혀", "절대", "네버", "하나도", "일절", "별로", "거의", "안함"
];

const KW_YES_BASE = [
  "네", "예", "응", "어", "예압", "옙", "넹", "네네", 
  "맞", "그렇", "당연", "물론", "그럼", "오케이", "ok", "하죠", "해요", "해", 
  "있", "먹어", "피워", "마셔", "합니다", "받았", "맞았", "그려", "그래"
];

const KW_DONT_KNOW_BASE = [
  "모르", "몰라", "기억", "글쎄", "가물", "생각", "확실", "패스"
];

/* ============================================================
  질문 리스트
   ============================================================ */
export const CHECKUP_QUESTIONS_REMAKE: CheckupQuestion[] = [
  // --- 1. 질환력 ---
  {
    id: 1, 
    category: "질환력", 
    type: "yesno",
    question: "현재 고혈압, 당뇨병, 고지혈증, 뇌졸중, 심장질환, 폐결핵 등으로 약을 드시고 계십니까?",
    options: [
        { 
          value: 1, 
          label: "아니요, 먹지 않습니다", 
          keywords: [...KW_NO_BASE, "약 안", "건강", "튼튼", "정상", "깨끗", "안 아파"] 
        },
        { 
          value: 2, 
          label: "네, 먹고 있습니다", 
          keywords: [...KW_YES_BASE, "약 먹", "복용", "처방", "병원", "혈압약", "당뇨약", "매일 먹어"] 
        },
    ],
    isReverse: true,
  },
  {
    id: 2, 
    category: "가족력", 
    type: "yesno",
    question: "가족(부모,형제,자매) 중 뇌졸중, 심근경색, 고혈압, 당뇨, 암 환자가 있습니까?",
    options: [
        { 
          value: 1, 
          label: "아니요, 없습니다", 
          keywords: [...KW_NO_BASE, "가족력", "아무도", "모두 건강", "다 건강"] 
        },
        { 
          value: 2, 
          label: "네, 있습니다", 
          keywords: [...KW_YES_BASE, "아버지", "어머니", "아빠", "엄마", "형제", "자매", "할머니", "할아버지", "돌아가신", "계셔"] 
        },
    ],
    isReverse: true,
  },
  {
    id: 3, 
    category: "감염병", 
    type: "select",
    question: "B형간염 바이러스 보균자이거나 현재 앓고 계십니까?",
    options: [
      { value: 1, label: "아니요", keywords: [...KW_NO_BASE, "정상", "항체", "깨끗", "없어"] },
      { value: 2, label: "네, 그렇습니다", keywords: [...KW_YES_BASE, "보균", "간염", "바이러스", "활동성"] },
      { value: 3, label: "잘 모르겠습니다", keywords: [...KW_DONT_KNOW_BASE, "검사", "안해봐서"] },
    ],
    isReverse: true,
  },

  // --- 2. 흡연 (일반담배) ---
  {
    id: 4, 
    category: "흡연경험_기초", 
    type: "yesno",
    question: "담배를 피우신 적이 있습니까?",
    options: [
        { 
          value: 1, 
          label: "아니요, 피운 적 없습니다", 
          keywords: [...KW_NO_BASE, "비흡연", "평생", "입에도", "담배 싫어", "안 배웠"] 
        },
        { 
          value: 2, 
          label: "네, 피운 적 있습니다", 
          keywords: [...KW_YES_BASE, "흡연", "피웠", "폈", "피지", "배웠"] 
        },
    ],
    isReverse: true,
  },
  {
    id: 5, 
    category: "흡연경험_100개비", 
    type: "yesno",
    question: "평생 담배를 5갑(100개비) 이상 피운 적이 있습니까?",
    options: [
        { 
          value: 1, 
          label: "아니요, 100개비 미만입니다", 
          keywords: [...KW_NO_BASE, "미만", "적게", "조금", "호기심", "장난", "몇 번"] 
        },
        { 
          value: 2, 
          label: "네, 5갑 이상 피웠습니다", 
          keywords: [...KW_YES_BASE, "이상", "많이", "넘게", "수백", "수천"] 
        },
    ],
    dependency: { targetId: 4, answerValue: 2 },
    isReverse: true,
  },
  {
    id: 6, 
    category: "현재흡연", 
    type: "select",
    question: "현재 담배를 피우십니까?",
    options: [
      { 
        value: 1, 
        label: "아니요, 끊었습니다 (과거 흡연)", 
        keywords: [...KW_NO_BASE, "끊었", "금연", "안 피워", "안 펴", "지금은", "옛날에"] 
      },
      { 
        value: 2, 
        label: "네, 현재 피웁니다", 
        keywords: [...KW_YES_BASE, "지금도", "피워", "펴", "아직", "못 끊", "흡연 중"] 
      },
    ],
    dependency: { targetId: 5, answerValue: 2 },
    isReverse: true,
  },
  {
    id: 7, 
    category: "흡연기간", 
    type: "select",
    question: "총 몇 년 정도 담배를 피우셨습니까? 번호로 말씀해 주세요.",
    options: [
        { value: 1, label: "10년 미만", keywords: ["10년", "십년", "구년", "팔년", "칠년", "육년", "오년", "짧게", "얼마 안", "몇 년"] },
        { value: 2, label: "10년 ~ 19년 사이", keywords: ["10년", "19년", "십년", "십오년", "십구년", "십 몇년"] },
        { value: 3, label: "20년 ~ 29년 사이", keywords: ["20년", "29년", "이십년", "이십오년", "오래", "이십 몇년"] },
        { value: 4, label: "30년 이상", keywords: ["30년", "삼십년", "평생", "사십년", "오십년", "넘게", "아주 오래"] },
        { value: 5, label: "기억나지 않습니다", keywords: KW_DONT_KNOW_BASE },
    ],
    dependency: { targetId: 6, answerValue: 2 },
    isReverse: true,
  },
  {
    id: 8, 
    category: "흡연량", 
    type: "select",
    question: "하루에 평균적으로 몇 개비나 피우십니까?",
    options: [
        { value: 1, label: "10개비 이하 (반 갑 미만)", keywords: ["10개", "열개", "미만", "조금", "몇 대", "몇 개", "다섯", "여섯"] },
        { value: 2, label: "반 갑 ~ 한 갑 정도", keywords: ["반 갑", "한 갑", "반갑", "한갑", "20개"] }, 
        { value: 3, label: "한 갑 ~ 한 갑 반 정도", keywords: ["한 갑", "한갑", "한 갑 반"] }, 
        { value: 4, label: "한 갑 반 이상", keywords: ["두 갑", "세 갑", "많이", "줄담배", "헤비", "골초"] }, 
        { value: 5, label: "잘 모르겠습니다", keywords: KW_DONT_KNOW_BASE },
    ],
    dependency: { targetId: 6, answerValue: 2 },
    isReverse: true,
  },
  {
    id: 9, 
    category: "과거흡연기간", 
    type: "select",
    question: "과거에 총 몇 년 정도 담배를 피우셨습니까?",
    options: [
        { value: 1, label: "10년 미만 피웠습니다", keywords: ["10년", "십년", "몇 년", "잠깐", "짧게"] },
        { value: 2, label: "10년 ~ 19년 정도 피웠습니다", keywords: ["10년", "19년", "십년", "십구년"] },
        { value: 3, label: "20년 ~ 29년 정도 피웠습니다", keywords: ["20년", "29년", "이십년", "이십구년"] },
        { value: 4, label: "30년 이상 피웠습니다", keywords: ["30년", "삼십년", "오래", "평생", "젊을 때"] },
        { value: 5, label: "기억나지 않습니다", keywords: KW_DONT_KNOW_BASE },
    ],
    dependency: { targetId: 6, answerValue: 1 },
    isReverse: true,
  },
  {
    id: 10, 
    category: "과거흡연량", 
    type: "select",
    question: "피우셨을 때 하루 평균 몇 개비 정도 피우셨습니까?",
    options: [
        { value: 1, label: "10개비 이하 (반 갑 미만)", keywords: ["10개", "열개", "이하", "조금", "몇 개"] },
        { value: 2, label: "반 갑 ~ 한 갑 정도", keywords: ["반 갑", "한 갑", "반갑", "한갑"] }, 
        { value: 3, label: "한 갑 ~ 한 갑 반 정도", keywords: ["한 갑", "한갑"] }, 
        { value: 4, label: "한 갑 반 이상", keywords: ["두 갑", "세 갑", "많이"] }, 
        { value: 5, label: "잘 모르겠습니다", keywords: KW_DONT_KNOW_BASE },
    ],
    dependency: { targetId: 6, answerValue: 1 },
    isReverse: true,
  },
  {
    id: 11, 
    category: "금연기간", 
    type: "select",
    question: "담배를 끊은 지 얼마나 되셨습니까?",
    options: [
      { value: 1, label: "1년 안 됐습니다", keywords: ["1년", "일년", "최근", "얼마 안", "개월", "몇 달", "이제 막"] },
      { value: 2, label: "1년에서 5년 사이입니다", keywords: ["1년", "2년", "3년", "4년", "5년", "일년", "이년", "삼년", "사년", "오년"] },
      { value: 3, label: "5년에서 10년 사이입니다", keywords: ["5년", "6년", "7년", "8년", "9년", "10년", "오년", "육년", "칠년", "팔년", "구년", "십년"] },
      { value: 4, label: "10년 넘었습니다", keywords: ["10년", "십년", "오래", "옛날", "20년", "까마득"] },
      { value: 5, label: "20년 넘었습니다", keywords: ["20년", "이십년", "아주 오래"] },
    ],
    dependency: { targetId: 6, answerValue: 1 },
    isReverse: false,
  },

  // --- 3. 전자담배 ---
  {
    id: 12, 
    category: "전자담배", 
    type: "yesno",
    question: "궐련형 전자담배(아이코스 등)를 피운 적이 있습니까?",
    options: [
        { value: 1, label: "아니요, 없습니다", keywords: [...KW_NO_BASE, "본 적", "없어", "안 펴봤어"] },
        { value: 2, label: "네, 있습니다", keywords: [...KW_YES_BASE, "아이코스", "릴", "글로", "전자", "전담", "쪄서"] },
    ],
    isReverse: true,
  },
  {
    id: 13, 
    category: "전자담배현재", 
    type: "select",
    question: "현재 궐련형 전자담배를 피우십니까?",
    options: [
      { value: 1, label: "아니요, 안 피웁니다", keywords: [...KW_NO_BASE, "안 펴", "끊었", "지금은 안"] },
      { value: 2, label: "네, 현재 피웁니다", keywords: [...KW_YES_BASE, "피워", "펴", "지금", "사용"] },
    ],
    dependency: { targetId: 12, answerValue: 2 },
    isReverse: true,
  },
  {
    id: 14, 
    category: "전자담배기간", 
    type: "select",
    question: "궐련형 전자담배를 총 몇 년 사용하셨습니까?",
    options: [
        { value: 1, label: "10년 미만", keywords: ["10년", "십년", "몇 년", "얼마 안", "최근"] },
        { value: 2, label: "10년 ~ 19년", keywords: ["10년", "십년", "오래"] },
        { value: 3, label: "20년 ~ 29년", keywords: ["20년", "이십년"] },
        { value: 4, label: "30년 이상", keywords: ["30년", "삼십년"] },
        { value: 5, label: "기억나지 않습니다", keywords: KW_DONT_KNOW_BASE },
    ],
    dependency: { targetId: 13, answerValue: 2 },
    isReverse: true,
  },
  {
    id: 15, 
    category: "전자담배량", 
    type: "select",
    question: "하루 평균 몇 개비 정도 사용하십니까?",
    options: [
        { value: 1, label: "10개비 이하", keywords: ["10개", "열개", "이하", "조금", "몇 번"] },
        { value: 2, label: "반 갑 ~ 한 갑", keywords: ["반 갑", "한 갑", "반갑", "한갑"] }, 
        { value: 3, label: "한 갑 ~ 한 갑 반", keywords: ["한 갑", "한갑"] }, 
        { value: 4, label: "한 갑 반 이상", keywords: ["두 갑", "많이"] }, 
        { value: 5, label: "잘 모르겠습니다", keywords: KW_DONT_KNOW_BASE },
    ],
    dependency: { targetId: 13, answerValue: 2 },
    isReverse: true,
  },
  {
    id: 16, 
    category: "액상경험", 
    type: "yesno",
    question: "액상형 전자담배를 사용한 경험이 있습니까?",
    options: [
        { value: 1, label: "아니요, 없습니다", keywords: [...KW_NO_BASE, "액상", "없어", "물약"] },
        { value: 2, label: "네, 있습니다", keywords: [...KW_YES_BASE, "액상", "베이핑", "수증기"] },
    ],
    isReverse: true,
  },
  {
    id: 17, 
    category: "액상빈도", 
    type: "select",
    question: "최근 한 달간 액상형 전자담배를 얼마나 사용하셨습니까?",
    options: [
        { value: 1, label: "전혀 안 썼습니다", keywords: [...KW_NO_BASE, "안 썼", "안 해", "안 함", "사용 안"] },
        { value: 2, label: "월 1회 이하", keywords: ["월 1회", "한 번", "한번", "어쩌다", "가끔"] },
        { value: 3, label: "월 2~4회 (매주 1번 정도)", keywords: ["월 2", "월 3", "월 4", "매주", "주 1", "주말에만"] },
        { value: 4, label: "주 2~3회", keywords: ["주 2", "주 3", "두세 번", "두세번"] },
        { value: 5, label: "주 4회 이상 (거의 매일)", keywords: ["주 4", "매일", "자주", "많이", "맨날", "항상"] },
    ],
    dependency: { targetId: 16, answerValue: 2 },
    isReverse: true,
  },

  // --- 4. 음주 ---
  {
    id: 18, 
    category: "음주빈도", 
    type: "select",
    question: "지난 1년 동안 술을 얼마나 자주 드셨습니까?",
    options: [
      { 
        value: 1, 
        label: "전혀 마시지 않았습니다", 
        keywords: [...KW_NO_BASE, "안 마셔", "안 먹어", "금주", "못 마셔", "술 못해", "안 좋아해", "끊었어"] 
      },
      { 
        value: 2, 
        label: "월 1번 이하로 마셨습니다", 
        keywords: ["월 1", "한 번", "한번", "어쩌다", "가끔", "행사", "회식 때만"] 
      },
      { 
        value: 3, 
        label: "월 2~4번 (매주 1번 정도)", 
        keywords: ["월 2", "월 3", "월 4", "매주", "주 1", "종종", "일주일에 한번"] 
      },
      { 
        value: 4, 
        label: "주 2~3번 정도 마셨습니다", 
        keywords: ["주 2", "주 3", "두세 번", "두세번"] 
      },
      { 
        value: 5, 
        label: "주 4번 이상 마셨습니다", 
        keywords: ["주 4", "매일", "자주", "많이", "맨날", "항상", "반주", "매일 마셔"] 
      },
    ],
    isReverse: true,
  },
  {
    id: 19, 
    category: "음주량", 
    type: "select",
    question: "술을 마시는 날에는 보통 몇 잔 드십니까? (소주/맥주 잔 기준)",
    options: [
      { value: 1, label: "1~2잔 정도 (가볍게)", keywords: ["1잔", "2잔", "한두", "한 잔", "두 잔", "가볍게", "조금", "입가심"] },
      { value: 2, label: "3~4잔 (반 병 정도)", keywords: ["3잔", "4잔", "서너", "세 잔", "네 잔", "반 병", "반병"] },
      { value: 3, label: "5~7잔 (한 병 정도)", keywords: ["5잔", "6잔", "7잔", "다여섯", "한 병", "한병", "일곱"] },
      { value: 4, label: "8~14잔 (두 병 정도)", keywords: ["8잔", "두 병", "두병", "각 일병", "열 잔"] },
      { value: 5, label: "15잔 이상 (두 병 넘게)", keywords: ["15잔", "세 병", "네 병", "많이", "짝", "말술", "부어라"] },
    ],
    dependency: { targetId: 18, answerValue: [2, 3, 4, 5] },
    isReverse: true,
  },

  // --- 5. 신체활동 (운동) ---
  {
    id: 20, 
    category: "고강도빈도", 
    type: "select",
    question: "숨이 많이 찰 정도의 고강도 운동(달리기, 등산 등)을 일주일에 며칠 하십니까?",
    options: [
        { value: 1, label: "전혀 하지 않습니다", keywords: [...KW_NO_BASE, "안 해", "안 함", "못 해", "숨쉬기", "힘들어"] },
        { value: 2, label: "주 1~2일 합니다", keywords: ["주 1", "주 2", "한두", "하루", "이틀", "주말에만", "등산"] },
        { value: 3, label: "주 3~4일 합니다", keywords: ["주 3", "주 4", "사흘", "나흘", "삼사일", "격일"] },
        { value: 4, label: "주 5~6일 합니다", keywords: ["주 5", "주 6", "닷새", "엿새", "오육일"] },
        { value: 5, label: "매일 합니다", keywords: ["매일", "맨날", "하루도 빠짐없이", "항상", "아침마다"] },
    ],
    isReverse: false,
  },
  {
    id: 21, 
    category: "고강도시간", 
    type: "select",
    question: "고강도 운동을 하는 날은 보통 몇 시간 하십니까?",
    options: [
        { value: 1, label: "30분도 안 합니다", keywords: ["30분", "삼십분", "미만", "짧게", "잠깐"] },
        { value: 2, label: "30분 ~ 1시간 사이", keywords: ["30분", "1시간", "한 시간", "삼사십분"] },
        { value: 3, label: "1시간 ~ 2시간 사이", keywords: ["1시간", "2시간", "한두 시간", "한시간 반"] },
        { value: 4, label: "2시간 ~ 4시간 사이", keywords: ["2시간", "3시간", "4시간", "두세 시간"] },
        { value: 5, label: "4시간 이상 합니다", keywords: ["4시간", "오래", "하루 종일", "많이"] },
    ],
    dependency: { targetId: 20, answerValue: [2, 3, 4, 5] },
    isReverse: false,
  },
  {
    id: 22, 
    category: "중강도빈도", 
    type: "select",
    question: "숨이 약간 찰 정도의 운동(빠르게 걷기 등)을 일주일에 며칠 하십니까?",
    options: [
        { value: 1, label: "전혀 하지 않습니다", keywords: [...KW_NO_BASE, "안 해", "안 걸어", "걷기 싫어"] },
        { value: 2, label: "주 1~2일 합니다", keywords: ["주 1", "주 2", "한두", "하루", "이틀"] },
        { value: 3, label: "주 3~4일 합니다", keywords: ["주 3", "주 4", "사흘", "나흘", "삼사일"] },
        { value: 4, label: "주 5~6일 합니다", keywords: ["주 5", "주 6", "오육일", "평일에"] },
        { value: 5, label: "매일 합니다", keywords: ["매일", "맨날", "항상", "걷기", "만보"] },
    ],
    isReverse: false,
  },
  {
    id: 23, 
    category: "중강도시간", 
    type: "select",
    question: "중강도 운동을 하는 날은 보통 몇 시간 하십니까?",
    options: [
        { value: 1, label: "30분도 안 합니다", keywords: ["30분", "짧게", "잠깐", "이삼십분"] },
        { value: 2, label: "30분 ~ 1시간 사이", keywords: ["30분", "1시간", "한 시간", "오십분"] },
        { value: 3, label: "1시간 ~ 2시간 사이", keywords: ["1시간", "2시간", "한두 시간", "구십분"] },
        { value: 4, label: "2시간 ~ 4시간 사이", keywords: ["2시간", "3시간", "두세 시간"] },
        { value: 5, label: "4시간 이상 합니다", keywords: ["4시간", "많이", "오래"] },
    ],
    dependency: { targetId: 22, answerValue: [2, 3, 4, 5] },
    isReverse: false,
  },
  {
    id: 24, 
    category: "근력운동", 
    type: "select",
    question: "근력 운동(헬스, 아령 등)을 일주일에 며칠 하십니까?",
    options: [
        { value: 1, label: "전혀 하지 않습니다", keywords: [...KW_NO_BASE, "안 해", "헬스 안 해", "무거워"] },
        { value: 2, label: "주 1~2일 합니다", keywords: ["주 1", "주 2", "한두", "하루", "이틀"] },
        { value: 3, label: "주 3~4일 합니다", keywords: ["주 3", "주 4", "삼사일"] },
        { value: 4, label: "주 5~6일 합니다", keywords: ["주 5", "주 6", "오육일"] },
        { value: 5, label: "매일 합니다", keywords: ["매일", "맨날", "헬창", "헬스장"] },
    ],
    isReverse: false,
  },

  // --- 6. 노인기능 ---
  {
    id: 25, 
    category: "예방접종", 
    type: "yesno",
    question: "최근 1년 내 독감/폐렴구균 예방접종을 받으셨습니까?",
    options: [
        { value: 1, label: "아니요, 안 받았습니다", keywords: [...KW_NO_BASE, "안 받았", "안 맞았", "주사 안"] },
        { value: 2, label: "네, 받았습니다", keywords: [...KW_YES_BASE, "받았", "맞았", "주사", "접종", "독감", "폐렴"] },
    ],
    isReverse: false,
  },
  {
    id: 26, 
    category: "일상생활", 
    type: "select",
    question: "식사, 옷 입기, 목욕, 외출 등을 혼자서 잘 하십니까?",
    options: [
      { 
        value: 1, 
        label: "아니요, 도움이 필요합니다", 
        keywords: [...KW_NO_BASE, "도움", "힘들어", "못 해", "어려워", "불편", "누가 해줘야"] 
      },
      { 
        value: 2, 
        label: "네, 혼자서 잘 합니다", 
        keywords: [...KW_YES_BASE, "혼자", "잘 해", "문제없어", "거뜬", "스스로", "알아서"] 
      },
    ],
    isReverse: false,
  },
  {
    id: 27, 
    category: "낙상", 
    type: "yesno",
    question: "지난 6개월 동안 넘어진 적이 있습니까?",
    options: [
        { value: 1, label: "아니요, 없었습니다", keywords: [...KW_NO_BASE, "없었", "안 넘어", "멀쩡"] },
        { value: 2, label: "네, 넘어진 적 있습니다", keywords: [...KW_YES_BASE, "넘어", "다쳤", "미끄러", "꽈당"] },
    ],
    isReverse: true,
  },
  {
    id: 28, 
    category: "배뇨장애", 
    type: "yesno",
    question: "소변을 지리거나 보는데 어려움이 있습니까?",
    options: [
        { value: 1, label: "아니요, 괜찮습니다", keywords: [...KW_NO_BASE, "괜찮", "정상", "문제없", "시원"] },
        { value: 2, label: "네, 어려움이 있습니다", keywords: [...KW_YES_BASE, "어려움", "힘들어", "지려", "새", "찔끔"] },
    ],
    isReverse: true,
  },

  // --- 7. 인지기능 ---
  {
    id: 29, 
    category: "기억력", 
    type: "select",
    question: "1년 전보다 날짜, 약속, 물건 둔 곳을 기억하기 어려우십니까?",
    options: [
        { value: 1, label: "아니요, 그렇지 않습니다", keywords: [...KW_NO_BASE, "똑같", "괜찮", "생생", "기억 잘"] },
        { value: 3, label: "가끔 깜빡합니다", keywords: ["가끔", "종종", "깜빡", "조금", "어쩌다", "건망증"] },
        { value: 5, label: "네, 자주 그렇습니다", keywords: [...KW_YES_BASE, "자주", "많이", "기억 안", "가물가물", "치매"] },
    ],
    isReverse: true,
  },
  {
    id: 30, 
    category: "판단력", 
    type: "select",
    question: "계산이 서툴러지거나 길을 잃은 적이 있습니까?",
    options: [
        { value: 1, label: "아니요, 없습니다", keywords: [...KW_NO_BASE, "없어", "잘 해", "빠릿"] },
        { value: 3, label: "가끔 그렇습니다", keywords: ["가끔", "종종", "한두 번", "실수", "조금"] },
        { value: 5, label: "네, 자주 그렇습니다", keywords: [...KW_YES_BASE, "자주", "잃어", "못 해", "서툴", "헤매"] },
    ],
    isReverse: true,
  },
  {
    id: 31, 
    category: "성격변화", 
    type: "select",
    question: "예전에 비해 성격이 변했거나 만사가 귀찮아지셨습니까?",
    options: [
        { value: 1, label: "아니요, 안 그렇습니다", keywords: [...KW_NO_BASE, "안 그래", "활기", "그대로"] },
        { value: 3, label: "가끔 귀찮습니다", keywords: ["가끔", "귀찮", "조금", "그럴 때도"] },
        { value: 5, label: "네, 자주 그렇습니다", keywords: [...KW_YES_BASE, "우울", "변했", "짜증", "화가", "무기력"] },
    ],
    isReverse: true,
  },

  // --- 8. 영양 ---
  {
    id: 32, 
    category: "건강식", 
    type: "select",
    question: "채소, 과일, 유제품, 단백질을 매일 드십니까?",
    options: [
      { value: 1, label: "잘 안 먹는 편입니다", keywords: [...KW_NO_BASE, "안 먹", "싫어", "가끔", "편식"] },
      { value: 2, label: "보통입니다", keywords: ["보통", "그저", "반반", "노력"] },
      { value: 3, label: "네, 매일 챙겨 먹습니다", keywords: [...KW_YES_BASE, "매일", "항상", "잘 먹", "좋아", "채소", "고기"] },
    ],
    isReverse: false,
  },
  {
    id: 33, 
    category: "주의식", 
    type: "select",
    question: "짠 음식, 튀김, 단 음료 등을 자주 드십니까?",
    options: [
      { value: 1, label: "잘 안 먹습니다 (싱겁게 먹음)", keywords: [...KW_NO_BASE, "싱겁", "안 먹", "싫어", "저염"] },
      { value: 2, label: "보통입니다", keywords: ["보통", "가끔"] },
      { value: 3, label: "네, 자주 먹습니다", keywords: [...KW_YES_BASE, "자주", "좋아", "맛있", "짜게", "달게", "튀김", "국물"] },
    ],
    isReverse: true,
  },
  {
    id: 34, 
    category: "규칙식사", 
    type: "select",
    question: "세끼를 규칙적으로 드시고 외식을 자제하십니까?",
    options: [
      { value: 1, label: "규칙적이지 않습니다", keywords: [...KW_NO_BASE, "불규칙", "거를 때", "아침 안", "대충"] },
      { value: 2, label: "보통입니다", keywords: ["보통", "노력"] },
      { value: 3, label: "네, 규칙적으로 먹습니다", keywords: [...KW_YES_BASE, "규칙", "꼬박꼬박", "삼시세끼", "제때"] },
    ],
    isReverse: false,
  },
];