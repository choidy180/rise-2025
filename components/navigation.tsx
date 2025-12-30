"use client";

import React, { useState } from "react";
import Image from "next/image";
import styled from "styled-components";
import LogoImage from "@/public/logo/logo-ai.png";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";

const Navigation = () => {
  const { status } = useAuthStore();
  const router = useRouter();

  // 🔐 모달 상태 및 입력값 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  // 1. 문진 기록 보기 이동
  const handleHistoryClick = () => {
    router.push("/history");
  };

  // 2. 의료 기록 확인 (모달 열기)
  const openAdminModal = () => {
    setIsModalOpen(true);
    setAccessCode(""); // 초기화
  };

  const closeAdminModal = () => {
    setIsModalOpen(false);
  };

  // 3. 관리자 코드 검증 로직
  const handleAdminCheck = (e?: React.FormEvent) => {
    e?.preventDefault(); // form submit 방지

    if (accessCode === "admin") {
      setIsModalOpen(false);
      router.push("/doctor-view");
    } else {
      alert("접근 권한이 없거나 접근 코드가 올바르지 않습니다.");
      setAccessCode(""); // 틀리면 입력창 비우기
    }
  };

  return (
    <>
      <Container role="navigation" aria-label="Global">
        <Image
          src={LogoImage}
          style={{ cursor: "pointer" }}
          width={240}
          height={48}
          alt="ADHD-DIAGNOSIS"
          priority
          onClick={() => router.push("/")}
        />

        <BtnBox>
          {/* ✅ [추가됨] 문진 기록 보기 버튼 */}
          <BtnVariantGhost type="button" onClick={handleHistoryClick}>
            문진 기록 보기
          </BtnVariantGhost>

          {/* ✅ [추가됨] 의료 기록 확인 버튼 */}
          <BtnVariantPrimary type="button" onClick={openAdminModal}>
            의료진 확인
          </BtnVariantPrimary>
        </BtnBox>
      </Container>

      {/* 🔐 관리자 인증 모달 */}
      {isModalOpen && (
        <ModalOverlay onClick={closeAdminModal}>
          {/* 모달 내부 클릭 시 닫히지 않도록 이벤트 전파 중단 */}
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>관리자 접근 권한 확인</ModalTitle>
            <ModalDesc>의료진 전용 코드를 입력해주세요.</ModalDesc>
            
            <form onSubmit={handleAdminCheck}>
              <ModalInput
                type="password"
                placeholder="코드를 입력하세요"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                autoFocus
              />
              
              <ModalBtnGroup>
                <BtnVariantGhost type="button" onClick={closeAdminModal}>
                  취소
                </BtnVariantGhost>
                <BtnVariantPrimary type="submit">
                  확인
                </BtnVariantPrimary>
              </ModalBtnGroup>
            </form>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
};

export default Navigation;

/* ====================== styled ====================== */

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;

  width: 100%;
  height: 72px; /* max-height 대신 명시적 높이 권장 */

  display: flex;
  justify-content: space-between;
  align-items: center;

  background: #ffffff;
  padding: 0 20px; /* 좌우 여백 조정 */
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  pointer-events: auto;
`;

const BtnBox = styled.div`
  display: flex;
  align-items: center;
  gap: 12px; /* 간격 살짝 넓힘 */
`;

/* 버튼 공통 스타일 */
const ButtonBase = styled.button`
  appearance: none;
  border: 1px solid transparent; /* 2px -> 1px 로 조정하여 세련되게 */
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:active {
    transform: translateY(1px);
  }
`;

const BtnVariantGhost = styled(ButtonBase)`
  color: #4b5563;
  background: #f3f4f6;
  border-color: transparent;
  &:hover {
    background: #e5e7eb;
    color: #1f2937;
  }
`;

const BtnVariantPrimary = styled(ButtonBase)`
  color: #ffffff;
  background: #6366f1;
  border-color: #6366f1;
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
  &:hover {
    background: #4f46e5;
    border-color: #4f46e5;
  }
`;

/* ====================== Modal Styled ====================== */

const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); /* 반투명 검정 배경 */
  z-index: 10000; /* 네비게이션보다 위에 */
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(2px); /* 배경 흐림 효과 */
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background: white;
  padding: 30px;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  text-align: center;
`;

const ModalDesc = styled.p`
  margin: 0;
  font-size: 0.95rem;
  color: #6b7280;
  text-align: center;
  margin-bottom: 8px;
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
  margin-bottom: 20px;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const ModalBtnGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;