import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

interface MarketDisputedEmailProps {
  userName: string;
  marketTitle: string;
  reason?: string;
  marketLink: string;
  baseUrl?: string;
}

export const MarketDisputedEmail = ({
  userName,
  marketTitle,
  reason,
  marketLink,
  baseUrl = process.env.NEXT_PUBLIC_APP_URL || "",
}: MarketDisputedEmailProps) => {
  const previewText = `Market disputed: ${marketTitle}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px]">
              <Img
                src={`${baseUrl}/chami-sad.png`}
                width="60"
                height="60"
                alt="Proph.bet"
                className="my-0 mx-auto"
              />
            </Section>
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              Market Disputed
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hi {userName},
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              The market <strong>{marketTitle}</strong> has been disputed by a user.
            </Text>
            {reason && (
               <Section className="bg-gray-50 p-4 rounded-md my-4 border border-gray-200">
                  <Text className="text-gray-600 text-[12px] font-bold uppercase mb-2">Reason</Text>
                  <Text className="text-black text-[14px] italic">
                    "{reason}"
                  </Text>
               </Section>
            )}
            <Text className="text-black text-[14px] leading-[24px]">
              Please review this dispute and take appropriate action if necessary.
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={marketLink}
              >
                Review Market
              </Button>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default MarketDisputedEmail;

