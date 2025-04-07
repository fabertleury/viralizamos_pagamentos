import styled from 'styled-components';

export const FooterContainer = styled.footer`
  background-color: #ffffff;
  border-top: 1px solid #e2e8f0;
  padding: 1.5rem 1rem;
`;

export const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  
  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

export const FooterLogo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  img {
    height: 1.5rem;
    width: auto;
  }
`;

export const FooterLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
`;

export const FooterLink = styled.a`
  color: #64748b;
  font-size: 0.875rem;
  text-decoration: none;
  transition: color 0.2s ease;
  
  &:hover {
    color: #db2777;
    text-decoration: none;
  }
`;

export const Copyright = styled.div`
  color: #94a3b8;
  font-size: 0.75rem;
  margin-top: 1rem;
  
  @media (min-width: 768px) {
    margin-top: 0;
    text-align: right;
  }
`; 