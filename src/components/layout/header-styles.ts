import styled from 'styled-components';

export const HeaderContainer = styled.header`
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
`;

export const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.25rem;
  color: #db2777;

  img {
    height: 2rem;
    width: auto;
  }
`;

export const LogoText = styled.span`
  display: flex;
  flex-direction: column;
  line-height: 1.1;
`;

export const LogoSubtext = styled.span`
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 400;
`;

export const Nav = styled.nav`
  display: flex;
  gap: 1.5rem;
`;

export const NavLink = styled.a`
  color: #64748b;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: #db2777;
    text-decoration: none;
  }

  &.active {
    color: #db2777;
    font-weight: 600;
  }
`;

export const MobileMenuButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  
  @media (min-width: 768px) {
    display: none;
  }
`;

export const DesktopNav = styled.div`
  display: none;
  
  @media (min-width: 768px) {
    display: flex;
    gap: 1.5rem;
  }
`;

export const MobileNav = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ffffff;
  padding: 1.5rem;
  display: ${props => props.isOpen ? 'flex' : 'none'};
  flex-direction: column;
  gap: 1.5rem;
  z-index: 50;
`;

export const MobileNavHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

export const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
`; 