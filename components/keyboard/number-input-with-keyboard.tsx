import React from "react";
import Keyboard from "react-simple-keyboard";
import styled from "styled-components";
import { numberLayout } from "@/data/numberLayout";

type NumericKeyboardProps = {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  onEnter?: () => void;
};

const NumericKeyboard: React.FC<NumericKeyboardProps> = ({
  value,
  setValue,
  onEnter,
}) => {
  const onKeyPress = (key: string) => {
    if (key === "{pre}") {
      setValue((prev) => prev.slice(0, -1));
    } else if (key === "{enterNum}") {
      onEnter?.();
    } else if (/^\d$/.test(key)) {
      setValue((prev) => prev + key);
    }
  };

  return (
    <KeyboardWrapper>
      <Keyboard
        layout={numberLayout}
        onKeyPress={onKeyPress}
        display={{
          "{pre}": "←",
          "{enterNum}": "Enter",
        }}
        theme="hg-theme-default numeric-keyboard"
      />
    </KeyboardWrapper>
  );
};

export default NumericKeyboard;


const KeyboardWrapper = styled.div`
  width: 100%;
  background-color: #f1f5f9;

  /* root */
  .simple-keyboard.numeric-keyboard {
    width: 100%;
    background: transparent;
    box-shadow: none;
  }

  /* 각 줄을 flex로 (기본도 flex지만, 우리가 사이즈를 통일할 목적) */
  .simple-keyboard.numeric-keyboard .hg-row {
    display: flex;
  }

  /* 모든 버튼을 동일 비율로 꽉 채우기 */
  .simple-keyboard.numeric-keyboard .hg-row .hg-button {
    flex: 1 1 0 !important;
    max-width: none;
    /* margin: 4px; */
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }

  /* Enter, ← 같은 기능키도 크기 똑같이 */
  .simple-keyboard.numeric-keyboard
    .hg-row
    .hg-button.hg-functionBtn {
    flex: 1 1 0 !important;
  }
`;
