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

interface ArenaInvitationEmailProps {
  inviterName: string;
  arenaName: string;
  inviteLink: string;
  userEmail: string; // Used for "This invite was sent to..."
  baseUrl?: string;
}

export const ArenaInvitationEmail = ({
  inviterName,
  arenaName,
  inviteLink,
  userEmail,
  baseUrl = process.env.NEXT_PUBLIC_APP_URL || "",
}: ArenaInvitationEmailProps) => {
  const previewText = `${inviterName} invited you to join ${arenaName} on Proph.bet`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Section className="mt-[32px]">
              <Img
                src={`${baseUrl}/chami-beige.png`}
                width="60"
                height="60"
                alt="Proph.bet"
                className="my-0 mx-auto"
              />
            </Section>
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              Join <strong>{arenaName}</strong>
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              Hello,
            </Text>
            <Text className="text-black text-[14px] leading-[24px]">
              <strong>{inviterName}</strong> has invited you to join the <strong>{arenaName}</strong> arena on Proph.bet.
            </Text>
            <Section className="text-center mt-[32px] mb-[32px]">
              <Button
                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                href={inviteLink}
              >
                Join Arena
              </Button>
            </Section>
            <Text className="text-black text-[14px] leading-[24px]">
              or copy and paste this URL into your browser:{" "}
              <Link href={inviteLink} className="text-blue-600 no-underline">
                {inviteLink}
              </Link>
            </Text>
            <Text className="text-[#666666] text-[12px] leading-[24px] mt-[32px]">
              This invitation was intended for <span className="text-black">{userEmail}</span>. If you were not expecting this invitation, you can ignore this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ArenaInvitationEmail;

