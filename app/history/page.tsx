"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import styled, { css, keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

// ✅ 한글 조합을 위한 필수 라이브러리
import * as Hangul from "hangul-js";

// 키보드 라이브러리
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";

// 프로젝트 내 유틸리티
import { getHealthRecords, HealthRecord, formatDate } from "@/utils/storage";
import Navigation from "@/components/navigation";

// ----------------------------------------------------------------------
// 🛠️ [Logic] 주민번호 유효성 검사
// ----------------------------------------------------------------------
const isValidRRN = (rrn: string): boolean => {
  if (!rrn || rrn.length !== 13) return false;
  
  const multipliers = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;

  for (let i = 0; i < 12; i++) {
    sum += parseInt(rrn[i], 10) * multipliers[i];
  }

  const remainder = sum % 11;
  const checkDigit = (11 - remainder) % 10;

  return checkDigit === parseInt(rrn[12], 10);
};

// ----------------------------------------------------------------------
// ⌨️ [Component] 숫자 키패드 (UI 이미지와 동일하게 수정됨)
// ----------------------------------------------------------------------
interface NumericKeyboardProps {
  setValue: (updater: (prev: string) => string) => void;
}

const NumericKeyboard: React.FC<NumericKeyboardProps> = ({ setValue }) => {
  // 숫자 랜덤 배열 (보안용) + 뒤로가기 키 배치
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    const nums = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    const shuffled = nums.sort(() => Math.random() - 0.5);
    // 0이 맨 마지막(가운데)에 오도록 조정하거나, 3열 그리드에 맞게 배치
    // 이미지처럼: 9개 숫자 + (빈칸) + 0 + (지우기) 형태로 배치
    // 여기서는 편의상 1~9, 빈칸, 0, 지우기 순서로 배치 로직 구현
    
    // 1. 0을 뺀 나머지 섞기
    const nonZero = ["1", "2", "3", "4", "5", "6", "7", "8", "9"].sort(() => Math.random() - 0.5);
    
    // 2. 배열 구성: [숫자9개] + [빈칸] + [0] + [지우기]
    setKeys([...nonZero, "", "0", "backspace"]);
  }, []);

  const handlePress = (key: string) => {
    if (!key) return; // 빈칸 클릭 무시
    if (key === "backspace") {
      setValue((prev) => prev.slice(0, -1));
    } else {
      setValue((prev) => (prev.length < 13 ? prev + key : prev));
    }
  };

  return (
    <NumpadContainer>
      <NumpadGrid>
        {keys.map((k, i) => {
          if (k === "") return <div key={i} />; // 빈 공간
          return (
            <NumButton 
              key={i} 
              onClick={() => handlePress(k)} 
              $isIcon={k === "backspace"}
            >
              {k === "backspace" ? "←" : k}
            </NumButton>
          );
        })}
      </NumpadGrid>
    </NumpadContainer>
  );
};

// ----------------------------------------------------------------------
// ⌨️ [Component] 한글 키보드 (Hangul-js 적용으로 조합 문제 해결)
// ----------------------------------------------------------------------
interface HangulKeyboardProps {
  text: string;
  setText: (val: string) => void;
  onEnter: () => void;
}

const HangulKeyboard: React.FC<HangulKeyboardProps> = ({ text, setText, onEnter }) => {
  const keyboardRef = useRef<any>(null);

  const onKeyPress = (button: string) => {
    // 1. Shift 키 처리
    if (button === "{shift}") {
      const currentLayout = keyboardRef.current.options.layoutName;
      keyboardRef.current.setOptions({
        layoutName: currentLayout === "default" ? "shift" : "default",
      });
      return;
    }

    // 2. Enter 키 처리
    if (button === "{enter}") {
      onEnter();
      return;
    }

    // 3. 지우기(Backspace) 처리
    if (button === "{bksp}") {
      const disassembled = Hangul.disassemble(text);
      disassembled.pop(); // 마지막 자소 삭제
      setText(Hangul.assemble(disassembled));
      return;
    }

    // 4. 일반 자소 입력 (한글 조합 로직)
    // 현재 텍스트를 자소 분리 -> 입력된 키 추가 -> 다시 조립
    const disassembled = Hangul.disassemble(text);
    disassembled.push(button);
    const assembled = Hangul.assemble(disassembled);
    setText(assembled);
  };

  return (
    <KeyboardWrapper>
      <Keyboard
        keyboardRef={(r) => (keyboardRef.current = r)}
        layout={{
          default: [
            "1 2 3 4 5 6 7 8 9 0",
            "ㅂ ㅈ ㄷ ㄱ ㅅ ㅛ ㅕ ㅑ ㅐ ㅔ",
            "ㅁ ㄴ ㅇ ㄹ ㅎ ㅗ ㅓ ㅏ ㅣ {bksp}",
            "{shift} ㅋ ㅌ ㅊ ㅍ ㅠ ㅜ ㅡ {enter}",
          ],
          shift: [
            "! @ # $ % ^ & * ( )",
            "ㅃ ㅉ ㄸ ㄲ ㅆ ㅛ ㅕ ㅑ ㅒ ㅖ",
            "ㅁ ㄴ ㅇ ㄹ ㅎ ㅗ ㅓ ㅏ ㅣ {bksp}",
            "{shift} ㅋ ㅌ ㅊ ㅍ ㅠ ㅜ ㅡ {enter}",
          ],
        }}
        display={{
          "{bksp}": "⌫",
          "{enter}": "입력완료",
          "{shift}": "Shift",
        }}
        onKeyPress={onKeyPress}
        // onChange는 사용하지 않고 onKeyPress로 직접 제어합니다.
      />
    </KeyboardWrapper>
  );
};

// ----------------------------------------------------------------------
// 🚨 [Component] 에러 모달 (디자인 개선)
// ----------------------------------------------------------------------
const AlertModal = ({ isOpen, onClose, message }: { isOpen: boolean; onClose: () => void; message: string }) => {
  if (!isOpen) return null;
  return (
    <ModalOverlay onClick={onClose} style={{ zIndex: 1100 }}>
      <AlertContent
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <AlertIcon>🚫</AlertIcon>
        <AlertTitle>인증 실패</AlertTitle>
        <AlertDesc>{message}</AlertDesc>
        <AlertButton onClick={onClose}>확인</AlertButton>
      </AlertContent>
    </ModalOverlay>
  );
};

// ----------------------------------------------------------------------
// 🔐 [Component] 검증 모달 (메인)
// ----------------------------------------------------------------------
interface VerificationModalProps {
  targetRecord: HealthRecord;
  onClose: () => void;
  onSuccess: (id: string) => void;
}

const VerificationModal: React.FC<VerificationModalProps> = ({ targetRecord, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: 이름, 2: 주민번호
  const [name, setName] = useState("");
  const [rrn, setRrn] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 주민번호 마스킹 (앞6자리-1******)
  const formattedRrn = useMemo(() => {
    if (rrn.length <= 6) return rrn;
    const front = rrn.slice(0, 6);
    const backRaw = rrn.slice(6);
    const gender = backRaw.slice(0, 1);
    const mask = "●".repeat(Math.max(0, backRaw.length - 1));
    return `${front}-${gender}${mask}`;
  }, [rrn]);

  const isRrnComplete = rrn.length === 13;

  const handleNameSubmit = () => {
    if (!name.trim()) return;
    setStep(2);
  };

  const handleFinalSubmit = () => {
    // 1. 이름 불일치
    if (name.trim() !== targetRecord.name) {
      setErrorMsg("입력하신 이름이 문진 기록의 이름과 일치하지 않습니다.");
      return;
    }
    // 2. 주민번호 형식 오류
    if (!isValidRRN(rrn)) {
      setErrorMsg("주민등록번호 형식이 올바르지 않습니다.");
      return;
    }

    // 성공
    onSuccess(targetRecord.id);
  };

  return (
    <>
      <ModalOverlay onClick={onClose}>
        <AuthCard onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>본인 확인 ({step === 1 ? "이름" : "주민번호"})</ModalTitle>
            <CloseBtn onClick={onClose}>✕</CloseBtn>
          </ModalHeader>

          {/* 입력 필드 영역 (이름/주민번호 항상 표시하되 활성 상태만 강조) */}
          <InputGroup>
            <InputBox $active={step === 1} onClick={() => setStep(1)}>
              <Label>이름</Label>
              <Value>{name || <Placeholder>이름 입력</Placeholder>}</Value>
            </InputBox>
            
            <InputBox $active={step === 2} onClick={() => name && setStep(2)}>
              <Label>주민번호</Label>
              <Value>{rrn ? formattedRrn : <Placeholder>주민번호 13자리</Placeholder>}</Value>
            </InputBox>
          </InputGroup>

          <BodyArea>
            {step === 1 ? (
              <KeyboardContainer>
                <HangulKeyboard text={name} setText={setName} onEnter={handleNameSubmit} />
                <ActionBtn onClick={handleNameSubmit} disabled={!name}>다음</ActionBtn>
              </KeyboardContainer>
            ) : (
              <KeyboardContainer>
                <NumericKeyboard setValue={setRrn} />
                <ButtonGroup>
                  <PrevBtn onClick={() => setStep(1)}>이전</PrevBtn>
                  <ActionBtn onClick={handleFinalSubmit} disabled={!isRrnComplete}>
                    조회하기
                  </ActionBtn>
                </ButtonGroup>
              </KeyboardContainer>
            )}
          </BodyArea>
        </AuthCard>
      </ModalOverlay>

      {/* 에러 알림창 */}
      <AlertModal 
        isOpen={!!errorMsg} 
        message={errorMsg || ""} 
        onClose={() => setErrorMsg(null)}
      />
    </>
  );
};

// ----------------------------------------------------------------------
// 🚀 [Page] 메인 페이지
// ----------------------------------------------------------------------
export default function HistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);

  useEffect(() => {
    setRecords(getHealthRecords());
  }, []);

  const filteredRecords = records.filter(
    (r) => r.name.includes(searchTerm) || formatDate(r.date).includes(searchTerm)
  );

  return (
    <Container>
      <Navigation />
      <Content>
        <Header>
          <Title>📂 문진 기록 보관함</Title>
          <SubTitle>본인 확인 후 상세 기록을 열람할 수 있습니다.</SubTitle>
        </Header>

        <SearchArea>
          <SearchInput
            placeholder="이름 또는 날짜로 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <SearchIcon>🔍</SearchIcon>
        </SearchArea>

        <ListGrid>
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record, idx) => (
              <RecordCard
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <CardTop>
                  <NameBadge>{record.name}</NameBadge>
                  <DateText>{formatDate(record.date)}</DateText>
                </CardTop>
                <SummaryText>{record.summary || "요약 정보 없음"}</SummaryText>
                <CardFooter>
                  <ChatCount>💬 대화 {record.chatHistory.length}건</ChatCount>
                  <ViewBtn>🔒 상세보기</ViewBtn>
                </CardFooter>
              </RecordCard>
            ))
          ) : (
            <EmptyState>📭 저장된 기록이 없습니다.</EmptyState>
          )}
        </ListGrid>
      </Content>

      <AnimatePresence>
        {selectedRecord && (
          <VerificationModal
            targetRecord={selectedRecord}
            onClose={() => setSelectedRecord(null)}
            onSuccess={(id) => router.push(`/history/${id}`)}
          />
        )}
      </AnimatePresence>
    </Container>
  );
}

// ----------------------------------------------------------------------
// 💅 Styles
// ----------------------------------------------------------------------

/* 기본 레이아웃 */
const Container = styled.div` width: 100%; min-height: 100vh; background-color: #f1f5f9; display: flex; flex-direction: column; align-items: center; `;
const Content = styled.div` width: 100%; max-width: 800px; padding: 40px 20px; margin-top: 60px; `;
const Header = styled.div` margin-bottom: 30px; text-align: center; `;
const Title = styled.h1` font-size: 28px; font-weight: 800; color: #1e293b; margin-bottom: 8px; `;
const SubTitle = styled.p` font-size: 15px; color: #64748b; `;

/* 검색 및 리스트 */
const SearchArea = styled.div` position: relative; margin-bottom: 40px; `;
const SearchInput = styled.input` width: 100%; padding: 16px 20px; border-radius: 16px; border: 1px solid #e2e8f0; font-size: 16px; outline: none; transition: 0.2s; &:focus { border-color: #6366f1; } `;
const SearchIcon = styled.span` position: absolute; right: 20px; top: 50%; transform: translateY(-50%); color: #94a3b8; `;
const ListGrid = styled.div` display: flex; flex-direction: column; gap: 16px; `;
const RecordCard = styled(motion.div)` background: white; padding: 24px; border-radius: 20px; border: 1px solid #fff; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.02); &:hover { transform: translateY(-2px); border-color: #c7d2fe; box-shadow: 0 10px 15px rgba(99, 102, 241, 0.1); } `;
const CardTop = styled.div` display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; `;
const NameBadge = styled.span` font-size: 18px; font-weight: 700; color: #1e293b; `;
const DateText = styled.span` font-size: 13px; color: #94a3b8; `;
const SummaryText = styled.p` font-size: 15px; color: #4b5563; margin-bottom: 20px; `;
const CardFooter = styled.div` display: flex; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 16px; `;
const ChatCount = styled.span` font-size: 13px; color: #64748b; `;
const ViewBtn = styled.span` font-size: 14px; color: #6366f1; font-weight: 700; `;
const EmptyState = styled.div` text-align: center; padding: 60px; color: #94a3b8; `;

/* 모달 공통 */
const ModalOverlay = styled.div` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); animation: fadeIn 0.2s; @keyframes fadeIn { from{opacity:0} to{opacity:1} } `;
const AuthCard = styled.div` width: 500px; max-width: 90vw; background: white; border-radius: 24px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); display: flex; flex-direction: column; `;
const ModalHeader = styled.div` display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; `;
const ModalTitle = styled.h2` font-size: 20px; font-weight: 700; color: #111827; margin: 0; `;
const CloseBtn = styled.button` background: none; border: none; font-size: 24px; color: #9ca3af; cursor: pointer; `;

/* 입력 필드 그룹 */
const InputGroup = styled.div` display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; `;
const InputBox = styled.div<{ $active: boolean }>`
  display: flex; align-items: center; padding: 14px 20px; border-radius: 12px;
  border: 1px solid ${({ $active }) => ($active ? "#6366f1" : "#e5e7eb")};
  background: ${({ $active }) => ($active ? "#f5f7ff" : "#fff")};
  cursor: pointer; transition: 0.2s;
`;
const Label = styled.span` width: 80px; font-size: 14px; font-weight: 600; color: #374151; `;
const Value = styled.div` font-size: 16px; font-weight: 500; color: #111827; letter-spacing: 1px; `;
const Placeholder = styled.span` color: #9ca3af; font-weight: 400; letter-spacing: normal; `;

/* 키보드 영역 */
const BodyArea = styled.div` display: flex; flex-direction: column; `;
const KeyboardContainer = styled.div` margin-top: 10px; `;
const KeyboardWrapper = styled.div`
  .hg-theme-default { background-color: #f3f4f6; border-radius: 12px; padding: 10px; border: none; }
  .hg-button { background: white; border-bottom: 2px solid #d1d5db; border-radius: 8px; height: 45px; font-weight: 600; }
  .hg-button:active { transform: translateY(2px); border-bottom: none; }
`;

/* 숫자 키패드 (이미지 스타일 복구) */
const NumpadContainer = styled.div` display: flex; justify-content: center; margin: 20px 0; `;
const NumpadGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 240px;
`;
const NumButton = styled.button<{ $isIcon?: boolean }>`
  background: white; border: 1px solid #e2e8f0; border-radius: 16px;
  height: 60px; font-size: 22px; font-weight: 600; color: #1e293b;
  cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.05); transition: 0.1s;
  display: flex; align-items: center; justify-content: center;
  &:active { transform: scale(0.95); background: #f8fafc; box-shadow: none; }
  ${({ $isIcon }) => $isIcon && css` color: #ef4444; font-size: 20px; `}
`;

/* 버튼 그룹 */
const ButtonGroup = styled.div` display: flex; gap: 10px; margin-top: 20px; `;
const ActionBtn = styled.button`
  width: 100%; padding: 16px; border-radius: 12px; border: none;
  background: #6366f1; color: white; font-size: 16px; font-weight: 700; cursor: pointer;
  margin-top: 20px; transition: 0.2s;
  &:disabled { background: #c7d2fe; cursor: not-allowed; }
  &:hover:not(:disabled) { background: #4f46e5; }
`;
const PrevBtn = styled(ActionBtn)` margin-top: 20px; background: #e5e7eb; color: #374151; &:hover { background: #d1d5db; } `;

/* 에러 모달 */
const AlertContent = styled(motion.div)`
  background: white; padding: 32px; border-radius: 20px; width: 320px; text-align: center;
  box-shadow: 0 25px 50px rgba(0,0,0,0.25);
`;
const AlertIcon = styled.div` font-size: 48px; margin-bottom: 16px; `;
const AlertTitle = styled.h3` font-size: 20px; font-weight: 700; color: #1f2937; margin: 0 0 8px 0; `;
const AlertDesc = styled.p` font-size: 15px; color: #6b7280; margin: 0 0 24px 0; line-height: 1.5; `;
const AlertButton = styled.button`
  width: 100%; padding: 12px; background: #ef4444; color: white; border-radius: 10px;
  border: none; font-weight: 600; font-size: 15px; cursor: pointer;
  &:hover { background: #dc2626; }
`;