import React from "react";
import styled from "styled-components";

const Loader = () => {
  return (
    <StyledWrapper>
      <div className="dot-spinner">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="dot-spinner__dot" />
        ))}
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  .dot-spinner {
    --uib-size: 3.2rem;
    --uib-speed: 1s;
    --uib-color: #f8b7b7; /* Febeul Pink */
    --uib-glow: rgba(248, 183, 183, 0.6);

    position: relative;
    height: var(--uib-size);
    width: var(--uib-size);
  }

  .dot-spinner__dot {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  .dot-spinner__dot::before {
    content: "";
    height: 18%;
    width: 18%;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      #fff 0%,
      var(--uib-color) 60%
    );
    transform: scale(0);
    animation: luxePulse var(--uib-speed) ease-in-out infinite;
    box-shadow: 0 0 18px var(--uib-glow);
  }

  ${Array.from({ length: 8 })
    .map(
      (_, i) => `
    .dot-spinner__dot:nth-child(${i + 1}) {
      transform: rotate(${i * 45}deg);
    }

    .dot-spinner__dot:nth-child(${i + 1})::before {
      animation-delay: calc(var(--uib-speed) * -${(8 - i) / 8});
    }
  `
    )
    .join("")}

  @keyframes luxePulse {
    0% {
      transform: scale(0);
      opacity: 0.4;
    }
    50% {
      transform: scale(1.2);
      opacity: 1;
    }
    100% {
      transform: scale(0);
      opacity: 0.4;
    }
  }
`;

export default Loader;
