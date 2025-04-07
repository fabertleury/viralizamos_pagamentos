import styled from 'styled-components';

export const FooterContainer = styled.footer`
  background-color: #0f172a;
  color: #ffffff;
  padding: 3rem 1.5rem;
`;

export const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr 1fr;
    gap: 4rem;
  }
`;

export const FooterLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;

  img {
    height: 2.5rem;
    width: auto;
  }
`;

export const FooterLogoText = styled.div`
  font-weight: 700;
  font-size: 1.5rem;
  color: #ffffff;
  line-height: 1.1;
`;

export const FooterAbout = styled.div`
  p {
    margin-bottom: 1.5rem;
    line-height: 1.6;
    color: #94a3b8;
  }
`;

export const SocialLinks = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

export const SocialLink = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.375rem;
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  transition: all 0.2s ease;

  &:hover {
    background-color: #db2777;
    color: #ffffff;
  }
`;

export const FooterColumn = styled.div``;

export const FooterHeading = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 1.25rem;
`;

export const FooterLinks = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const FooterLink = styled.li`
  margin-bottom: 0.75rem;

  a {
    color: #94a3b8;
    text-decoration: none;
    transition: color 0.2s ease;
    font-size: 0.9375rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;

    &:hover {
      color: #ffffff;
    }
  }
`;

export const FooterContact = styled.div`
  margin-top: 1.5rem;
`;

export const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  color: #94a3b8;
  font-size: 0.9375rem;
`;

export const FooterCopyright = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 2rem;
  margin-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

export const CopyrightText = styled.p`
  color: #64748b;
  font-size: 0.875rem;
  margin: 0;
`;

export const FooterBottom = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
`;

export const FooterBottomLink = styled.a`
  color: #64748b;
  font-size: 0.875rem;
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: #ffffff;
  }
`; 