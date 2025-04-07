import styled from 'styled-components';

export const HeaderContainer = styled.header`
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  position: sticky;
  top: 0;
  z-index: 50;
  transition: all 0.3s ease;

  &.sticky {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
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
  gap: 0.75rem;

  img {
    height: 2.5rem;
    width: auto;
  }
`;

export const LogoText = styled.div`
  font-weight: 700;
  font-size: 1.5rem;
  color: #db2777;
  line-height: 1.1;
`;

export const LogoBadge = styled.span`
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  background-color: #f1f5f9;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  margin-left: 0.5rem;
`;

export const Nav = styled.nav`
  display: flex;
  gap: 1.5rem;

  @media (max-width: 767px) {
    flex-direction: column;
    width: 100%;
    gap: 1rem;
  }
`;

export const NavLink = styled.a`
  color: #64748b;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s ease;
  padding: 0.5rem 0;
  position: relative;

  &:hover {
    color: #db2777;
    text-decoration: none;
  }

  &.active {
    color: #db2777;
    font-weight: 600;
  }

  &.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background-color: #db2777;
    border-radius: 1px;
  }

  @media (max-width: 767px) {
    padding: 0.75rem 0;
    border-bottom: 1px solid #e2e8f0;
    font-size: 1.125rem;

    &:last-child {
      border-bottom: none;
    }

    &.active::after {
      display: none;
    }
  }
`;

export const NavButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  background-color: #db2777;
  color: white;
  font-weight: 500;
  border-radius: 0.375rem;
  text-decoration: none;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #be185d;
    text-decoration: none;
    color: white;
  }

  @media (max-width: 767px) {
    margin-top: 0.5rem;
    width: 100%;
    padding: 0.75rem;
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
    align-items: center;
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
  z-index: 100;
  overflow-y: auto;
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