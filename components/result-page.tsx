"use client";

import React, { useState, useMemo } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { CHECKUP_QUESTIONS, CheckupQuestion } from "@/data/questionnaire/questionnaire-data"; 
import { SurveyResult } from "@/utils/survey-summary";
import { ChatMessage, saveHealthRecord } from "@/utils/storage";
import GeminiChat from "./gemini-chat";

interface Props {
  result: SurveyResult;
  initialMessages?: ChatMessage[];
  readOnly?: boolean;
  onRestart?: () => void;
  userName?: string;
}

// 🌈 카테고리별 아이콘 매핑 (이모지 사용으로 별도 라이브러리 없이 즉시 적용)
const getCategoryIcon = (category: string) => {
  if (category.includes("질환") || category.includes("가족")) return "🏥";
  if (category.includes("흡연")) return "🚬";
  if (category.includes("음주")) return "🍺";
  if (category.includes("운동") || category.includes("신체")) return "💪";
  if (category.includes("정신") || category.includes("기억")) return "🧠";
  if (category.includes("영양") || category.includes("식사")) return "🥗";
  if (category.includes("노인") || category.includes("낙상")) return "⚠️";
  return "📋";
};

// 📊 미니 차트 컴포넌트
const MiniBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
  const percent = Math.min((value / max) * 100, 100);
  return (
    <BarContainer>
      <BarFill 
        initial={{ width: 0 }} 
        animate={{ width: `${percent}%` }} 
        transition={{ duration: 1, ease: "easeOut" }}
        $color={color} 
      />
    </BarContainer>
  );
};

export default function ResultPage({
  result,
  onRestart,
  initialMessages = [],
  readOnly = false,
  userName = "방문자",
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  // 🔄 데이터 그룹화 (카테고리별로 묶기)
  const groupedData = useMemo(() => {
    const groups: Record<string, { q: CheckupQuestion; val: number; label: string }[]> = {};
    
    CHECKUP_QUESTIONS.forEach((q, idx) => {
      // 데이터 매칭 (인덱스 보정)
      const myVal = result.answers[idx] || 0;
      let label = "-";
      
      // 라벨 찾기
      if (q.options) {
        const found = q.options.find(opt => opt.value === myVal);
        if (found) label = found.label;
      } else {
        label = myVal > 0 ? `${myVal}` : "-";
      }

      if (!groups[q.category]) groups[q.category] = [];
      groups[q.category].push({ q, val: myVal, label });
    });
    return groups;
  }, [result]);

  const handleSave = () => {
    const nameToSave = userName || "방문자";
    saveHealthRecord({
      name: nameToSave,
      surveyResult: result,
      chatHistory: messages,
      summary: `종합 문진 결과 Report`,
    });
    if (confirm("저장되었습니다. 기록 보관함으로 이동하시겠습니까?")) {
      router.push("/history");
    }
  };

  return (
    <PageLayout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <ContentWrapper>
        {/* [LEFT] 대시보드 리포트 영역 */}
        <DashboardColumn>
          <DashboardHeader>
            <TitleArea>
              <MainTitle>
                <Highlight>{userName}</Highlight>님의 건강 프로필
              </MainTitle>
              <SubDesc>
                {readOnly ? "지난 기록 조회 중" : "전체 문진 응답 분석 리포트"}
              </SubDesc>
            </TitleArea>
            {!readOnly && <SaveBadge onClick={handleSave}>💾 저장하기</SaveBadge>}
          </DashboardHeader>

          {/* 🧩 Masonry Grid Layout (핵심: 카드 형태로 묶어서 보여줌) */}
          <GridContainer>
            {Object.entries(groupedData).map(([category, items], catIndex) => (
              <CategoryCard 
                key={category}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: catIndex * 0.1 }}
              >
                <CardHeader>
                  <IconBox>{getCategoryIcon(category)}</IconBox>
                  <CategoryTitle>{category}</CategoryTitle>
                </CardHeader>
                
                <ItemList>
                  {items.map(({ q, val, label }, i) => {
                    const isSkipped = val === 0;
                    // 색상 로직: 역방향이면(질병 등) 값이 클수록 빨강, 아니면 파랑
                    const isBad = q.isReverse ? val > 1 : val === 1; 
                    const statusColor = isSkipped ? "#e2e8f0" : isBad ? "#ef4444" : "#3b82f6";
                    const maxVal = q.options ? q.options.length : 5;

                    return (
                      <ItemRow key={q.id}>
                        <QuestionText>{q.question}</QuestionText>
                        
                        <ResultArea>
                          {/* 1. 척도형(Scale)은 그래프로 표현 */}
                          {(q.type === "scale" || q.type === "select") && !isSkipped && (
                            <MiniChartWrapper>
                              <MiniBar value={val} max={maxVal} color={statusColor} />
                              <ValueText $color={statusColor}>{label}</ValueText>
                            </MiniChartWrapper>
                          )}

                          {/* 2. 예/아니오(YesNo)는 뱃지로 표현 */}
                          {q.type === "yesno" && (
                            <Badge $color={statusColor} $isOutline={isSkipped}>
                              {label}
                            </Badge>
                          )}

                          {/* 3. 응답 없음 */}
                          {isSkipped && <SkippedDash>-</SkippedDash>}
                        </ResultArea>
                      </ItemRow>
                    );
                  })}
                </ItemList>
              </CategoryCard>
            ))}
          </GridContainer>

          <FooterBtnGroup>
             {!readOnly ? (
               <RestartBtn onClick={onRestart}>↺ 처음으로 돌아가기</RestartBtn>
             ) : (
               <RestartBtn onClick={() => router.push("/history")}>목록으로</RestartBtn>
             )}
          </FooterBtnGroup>
        </DashboardColumn>

        {/* [RIGHT] AI 분석 (Sticky) */}
        <ChatColumn>
          <StickyChatWrapper>
            <GeminiChat
              result={result}
              messages={messages}
              setMessages={setMessages}
              readOnly={readOnly}
            />
          </StickyChatWrapper>
        </ChatColumn>
      </ContentWrapper>
    </PageLayout>
  );
}

// --- ✨ 스타일 컴포넌트 (트렌디 & 전문가 스타일) ---

const PageLayout = styled(motion.div)`
  width: 100%; height: 100%; display: flex; justify-content: center; 
  padding: 30px; background: #f8fafc; overflow: hidden;
`;

const ContentWrapper = styled.div`
  display: flex; width: 100%; max-width: 1400px; height: 100%; gap: 30px;
  @media (max-width: 1100px) { flex-direction: column; overflow-y: auto; }
`;

const DashboardColumn = styled.div`
  flex: 3; overflow-y: auto; padding-right: 10px;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
`;

const ChatColumn = styled.div`
  flex: 1.2; min-width: 380px; height: 100%;
  @media (max-width: 1100px) { height: 600px; flex: none; }
`;
const StickyChatWrapper = styled.div` position: sticky; top: 0; height: 100%; `;

// 헤더 디자인
const DashboardHeader = styled.div`
  display: flex; justify-content: space-between; align-items: flex-end;
  margin-bottom: 30px;
`;
const TitleArea = styled.div` display: flex; flex-direction: column; gap: 4px; `;
const MainTitle = styled.h1` font-size: 28px; font-weight: 800; color: #1e293b; letter-spacing: -0.5px; margin: 0; `;
const Highlight = styled.span` color: #3b82f6; `;
const SubDesc = styled.span` font-size: 14px; color: #64748b; font-weight: 500; `;

const SaveBadge = styled.button`
  padding: 10px 20px; background: #1e293b; color: white; border-radius: 30px;
  font-size: 14px; font-weight: 700; border: none; cursor: pointer;
  transition: all 0.2s; box-shadow: 0 4px 10px rgba(30, 41, 59, 0.2);
  &:hover { transform: translateY(-2px); background: #334155; }
`;

// 📦 그리드 레이아웃 (핵심: 카드 묶음)
const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); // 반응형 카드 배치
  gap: 24px;
  margin-bottom: 40px;
`;

const CategoryCard = styled(motion.div)`
  background: white; border-radius: 24px; padding: 24px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #f1f5f9;
  display: flex; flex-direction: column; gap: 20px;
  &:hover { box-shadow: 0 15px 35px rgba(0,0,0,0.06); transform: translateY(-2px); transition: all 0.3s ease; }
`;

const CardHeader = styled.div` display: flex; align-items: center; gap: 12px; padding-bottom: 16px; border-bottom: 2px solid #f8fafc; `;
const IconBox = styled.div`
  width: 40px; height: 40px; background: #f0f9ff; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
`;
const CategoryTitle = styled.h3` font-size: 18px; font-weight: 700; color: #334155; margin: 0; `;

const ItemList = styled.div` display: flex; flex-direction: column; gap: 14px; `;
const ItemRow = styled.div`
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
`;

const QuestionText = styled.div`
  flex: 1; font-size: 14px; color: #475569; font-weight: 500; line-height: 1.4; word-break: keep-all;
`;

const ResultArea = styled.div`
  display: flex; align-items: center; justify-content: flex-end; min-width: 100px;
`;

// 📊 시각화 요소들
const MiniChartWrapper = styled.div` display: flex; flex-direction: column; align-items: flex-end; gap: 4px; min-width: 80px; `;
const BarContainer = styled.div` width: 60px; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; `;
const BarFill = styled(motion.div)<{ $color: string }>` height: 100%; background: ${({ $color }) => $color}; border-radius: 3px; `;
const ValueText = styled.span<{ $color: string }>` font-size: 12px; font-weight: 700; color: ${({ $color }) => $color}; `;

const Badge = styled.span<{ $color: string; $isOutline?: boolean }>`
  padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 700;
  background: ${({ $color, $isOutline }) => $isOutline ? "transparent" : `${$color}15`}; // 투명도 10%
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color, $isOutline }) => $isOutline ? "#e2e8f0" : "transparent"};
`;

const SkippedDash = styled.span` color: #cbd5e1; font-weight: 700; `;

const FooterBtnGroup = styled.div` margin-top: 20px; text-align: center; `;
const RestartBtn = styled.button`
  padding: 14px 28px; background: white; border: 1px solid #cbd5e1; color: #64748b;
  border-radius: 14px; font-size: 15px; font-weight: 600; cursor: pointer;
  transition: 0.2s;
  &:hover { background: #f1f5f9; color: #334155; border-color: #94a3b8; }
`;