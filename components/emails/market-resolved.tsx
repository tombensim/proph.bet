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

interface MarketResolvedEmailProps {
  userName: string;
  marketTitle: string;
  winningOption: string;
  marketLink: string;
  baseUrl?: string;
}

export const MarketResolvedEmail = ({
  userName,
  marketTitle,
  winningOption,
  marketLink,
  baseUrl = process.env.NEXT_PUBLIC_APP_URL || "",
}: MarketResolvedEmailProps) => {
  const previewText = `Market "${marketTitle}" has been resolved.`;

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
              Market Resolved
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hi {userName},
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              The market <strong>{marketTitle}</strong> has been resolved.
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              Winning Outcome: <strong>{winningOption}</strong>
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={marketLink}
              >
                View Results
              </Button>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default MarketResolvedEmail;

