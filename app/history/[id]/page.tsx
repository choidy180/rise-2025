"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useParams, useRouter } from "next/navigation";
import { getRecordById, HealthRecord } from "@/utils/storage";
import ResultPage from "@/components/result-page";
import Navigation from "@/components/navigation";

export default function RecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [record, setRecord] = useState<HealthRecord | null>(null);

  useEffect(() => {
    if (id) {
      const data = getRecordById(id);
      if (data) setRecord(data);
      else {
        alert("찾을 수 없는 기록입니다.");
        router.push("/history");
      }
    }
  }, [id, router]);

  if (!record) return null; // 로딩 중

  return (
    <Container>
      <Navigation />
      <HeaderSpace />
      {/* 기존 ResultPage를 재사용하여 상세 내역을 보여줍니다.
        readOnly prop을 true로 주어 저장 버튼을 숨기고 채팅을 읽기 전용으로 만듭니다.
      */}
      <ResultPage 
        result={record.surveyResult}
        initialMessages={record.chatHistory}
        readOnly={true} 
      />
    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  min-height: 100vh;
  background-color: #f1f5f9;
`;

const HeaderSpace = styled.div`
  height: 60px; /* 네비게이션 공간 확보 */
`;