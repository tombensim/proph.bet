import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

interface BetResolvedEmailProps {
  userName: string;
  marketTitle: string;
  outcome: "WON" | "LOST";
  profit?: number;
  marketLink: string;
  baseUrl?: string;
}

export const BetResolvedEmail = ({
  userName,
  marketTitle,
  outcome,
  profit,
  marketLink,
  baseUrl = process.env.NEXT_PUBLIC_APP_URL || "",
}: BetResolvedEmailProps) => {
  const isWin = outcome === "WON";
  const previewText = isWin 
    ? `You won your bet on "${marketTitle}"!` 
    : `Your bet on "${marketTitle}" has been resolved.`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px]">
              <Img
                src={`${baseUrl}/chami-judge.png`}
                width="60"
                height="60"
                alt="Proph.bet"
                className="my-0 mx-auto"
              />
            </Section>
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              {isWin ? "Congratulations!" : "Bet Resolved"}
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hi {userName},
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              Your bet on <strong>{marketTitle}</strong> has been resolved.
            </Text>
            {isWin && profit !== undefined && (
              <Text className="text-black text-[14px] leading-[24px]">
                You made a profit of <strong>{profit} points</strong>!
              </Text>
            )}
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={marketLink}
              >
                View Market
              </Button>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default BetResolvedEmail;

