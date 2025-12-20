// customKeyboard.tsx
import React, { useState } from "react";
import Keyboard from "react-simple-keyboard";
import styled from "styled-components";
import { koreanLayout } from "../data/koreanLayout";
import Hangul from "hangul-js";

type CustomKeyboardProps = {
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  onEnter?: () => void;
};

const CustomKeyboard: React.FC<CustomKeyboardProps> = ({
  text,
  setText,
  onEnter,
}) => {
  const [layoutName, setLayoutName] = useState<"default" | "shift">("default");

  const handleBackspace = () => {
    setText((prev) => {
      const dis = Hangul.disassemble(prev); // 전체를 자모 배열로
      dis.pop();                            // 마지막 자모 제거
      return Hangul.assemble(dis);          // 다시 완성형으로
    });
  };

  const handleAddKey = (key: string) => {
    setText((prev) => {
      const dis = Hangul.disassemble(prev);
      dis.push(key);                        // 새 자모 추가
      return Hangul.assemble(dis);
    });
  };

  const onKeyPress = (key: string) => {
    if (key === "{pre}") {
      handleBackspace();
    } else if (key === "{shift}") {
      setLayoutName((prev) => (prev === "default" ? "shift" : "default"));
    } else if (key === "{enterNum}" || key === "{enterText}") {
      onEnter?.();
    } else if (key === "{dot}") {
      setText((prev) => prev + ".");
    } else if (key === "{space}") {
      setText((prev) => prev + " ");
    } else {
      // 여기서 그냥 prev + key 하지 말고, 한글 조합기로 처리
      handleAddKey(key);
    }
  };

  return (
    <KeyboardWrapper>
      <Keyboard
        layoutName={layoutName}
        layout={koreanLayout}
        onKeyPress={onKeyPress}
        display={{
          "{enterText}": "Enter",
          "{shift}": "↑",
          "{.}": ".",
          "{space}": " ",
          "{dot}": ".",
          "{pre}": "←",
        }}
        theme="hg-theme-default"
      />
    </KeyboardWrapper>
  );
};

const KeyboardWrapper = styled.div``;

export default CustomKeyboard;
