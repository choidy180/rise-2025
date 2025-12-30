"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useParams, useRouter } from "next/navigation";
import DoctorSummaryReport from "@/components/doctor-summary-report";
import { SurveyResult } from "@/utils/survey-summary";
// ✅ 데이터 로딩 유틸리티 import
import { getHealthRecords } from "@/utils/storage";

export default function DoctorViewPage() {
  const params = useParams(); // URL 파라미터 가져오기 ({ id: '...' })
  const router = useRouter();
  
  const [surveyResult, setSurveyResult] = useState<SurveyResult | null>(null);
  const [userName, setUserName] = useState("환자");
  const [loading, setLoading] = useState(true);

  const resultId = params.id as string;

  useEffect(() => {
    // 🔍 ID를 이용해 데이터 가져오기 (유틸리티 함수 사용)
    const fetchData = () => {
      if (!resultId) return;

      try {
        setLoading(true);

        // 1. 저장된 모든 기록 가져오기
        const records = getHealthRecords();
        
        // 2. 현재 URL의 ID와 일치하는 기록 찾기
        const found = records.find((r) => r.id === resultId);
        
        if (found) {
          setSurveyResult(found.surveyResult);
          setUserName(found.name);
        } else {
          console.error(`ID(${resultId})에 해당하는 문진 기록을 찾을 수 없습니다.`);
        }
      } catch (e) {
        console.error("데이터 로드 실패", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resultId]);

  if (loading) return <LoadingPage>데이터를 불러오는 중입니다...</LoadingPage>;

  if (!surveyResult) {
    return (
      <EmptyState>
        <p>해당 문진 기록을 찾을 수 없습니다.</p>
        <BackButton onClick={() => router.back()}>목록으로 돌아가기</BackButton>
      </EmptyState>
    );
  }

  return (
    <PageContainer>
      <TopControl>
        <BackButton onClick={() => router.back()}>← 목록으로</BackButton>
        <PrintButton onClick={() => window.print()}>🖨️ 리포트 출력</PrintButton>
      </TopControl>

      <ReportWrapper>
        {/* 의사용 요약 리포트 컴포넌트 */}
        <DoctorSummaryReport result={surveyResult} userName={userName} />
      </ReportWrapper>
    </PageContainer>
  );
}

// --- 스타일 컴포넌트 (기존과 동일) ---
const PageContainer = styled.div`
  min-height: 100vh; background: #f1f5f9; padding: 40px 20px;
  display: flex; flex-direction: column; align-items: center; gap: 20px;
  
  @media print {
    padding: 0; background: white;
    button { display: none; } /* 인쇄 시 버튼 숨김 */
  }
`;

const TopControl = styled.div`
  width: 100%; max-width: 900px; display: flex; justify-content: space-between;
  @media print { display: none; }
`;

const ReportWrapper = styled.div` width: 100%; display: flex; justify-content: center; `;

const ButtonBase = styled.button`
  padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; transition: 0.2s;
`;
const BackButton = styled(ButtonBase)` background: #e2e8f0; color: #475569; &:hover { background: #cbd5e1; } `;
const PrintButton = styled(ButtonBase)` background: #1e293b; color: white; &:hover { background: #334155; } `;

const LoadingPage = styled.div`
  height: 100vh; display: flex; align-items: center; justify-content: center; color: #64748b; font-weight: 600;
`;
const EmptyState = styled(LoadingPage)` flex-direction: column; gap: 20px; `;