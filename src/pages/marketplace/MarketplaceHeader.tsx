import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Stethoscope,
  Building2,
  Layers,
  LogOut,
} from 'lucide-react';

interface MarketplaceHeaderProps {
  onOpenDraftDrawer?: () => void;
}

export default function MarketplaceHeader({
  onOpenDraftDrawer,
}: MarketplaceHeaderProps) {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { rfqDraft } = useData();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials =
    currentUser?.name
      ?.split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  const navClass = ({ isActive }: { isActive: boolean }) =>
    [
      'relative',
      'flex',
      'h-[76px]',
      'items-center',
      'gap-2.5',
      'px-7',
      'text-[13px]',
      'font-semibold',
      'whitespace-nowrap',
      'transition-colors',

      isActive
        ? 'text-[#0F4C42]'
        : 'text-[#475569] hover:text-[#0F4C42]',

      'after:absolute',
      'after:bottom-0',
      'after:left-6',
      'after:right-6',
      'after:h-[2px]',
      'after:rounded-full',

      isActive
        ? 'after:bg-[#0F4C42]'
        : 'after:bg-transparent',
    ].join(' ');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white">

      {/* =========================================================
          DESKTOP HEADER
      ========================================================= */}

      <div className="flex h-[76px] w-full items-center px-8 xl:px-12">

        {/* =======================================================
            BRAND
        ======================================================= */}

        <button
          type="button"
          onClick={() => navigate('/marketplace')}
          className="group flex shrink-0 items-center gap-3 text-left"
        >
          {/* Marketplace icon */}

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-[#EFF6F3]
              text-[#0F4C42]
              ring-1
              ring-[#CDE1DA]
              transition-colors
              group-hover:bg-[#E5F2ED]
            "
          >
            <Layers className="h-[21px] w-[21px]" />
          </div>

          {/* Brand text */}

          <div className="leading-none">

            <div className="flex items-center gap-2">

              <span className="text-[18px] font-bold tracking-[-0.02em] text-[#112A28]">
                HealthGrid IQ
              </span>

              <span
                className="
                  rounded-md
                  bg-[#EFF6F3]
                  px-2
                  py-1
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-wide
                  text-[#0F4C42]
                "
              >
                Marketplace
              </span>

            </div>

            <p className="mt-1.5 text-[10px] font-medium tracking-wide text-[#64748B]">
              Institutional Procurement
            </p>

          </div>
        </button>


        {/* =======================================================
            MAIN NAVIGATION
        ======================================================= */}

        <nav className="ml-16 hidden h-full items-center xl:ml-20 lg:flex">

          {/* HOME */}

          <NavLink
            to="/marketplace"
            end
            className={navClass}
          >
            Home
          </NavLink>


          {/* MEDICAL */}

          <NavLink
            to="/marketplace/medical"
            className={navClass}
          >
            <Stethoscope className="h-[17px] w-[17px]" />

            Medical Equipment
          </NavLink>


          {/* NON-MEDICAL */}

          <NavLink
            to="/marketplace/non-medical"
            className={navClass}
          >
            <Building2 className="h-[17px] w-[17px]" />

            Non-Medical Equipment
          </NavLink>

        </nav>


        {/* =======================================================
            RIGHT SIDE
        ======================================================= */}

        <div className="ml-auto flex items-center gap-5">

          {/* =====================================================
              RFQ DRAFT
          ===================================================== */}

          <button
            type="button"
            onClick={onOpenDraftDrawer}
            className="
              inline-flex
              h-10
              items-center
              gap-2
              rounded-xl
              bg-[#0F4C42]
              px-5
              text-[12px]
              font-bold
              text-white
              shadow-sm
              transition-all
              hover:bg-[#0B3831]
              hover:shadow
            "
          >

            <Layers className="h-4 w-4" />

            <span>
              Review RFQ Draft
            </span>

            {rfqDraft.length > 0 && (
              <span
                className="
                  flex
                  h-5
                  min-w-5
                  items-center
                  justify-center
                  rounded-full
                  bg-white
                  px-1.5
                  text-[10px]
                  font-extrabold
                  text-[#0F4C42]
                "
              >
                {rfqDraft.length}
              </span>
            )}

          </button>


          {/* DIVIDER */}

          <div className="h-8 w-px bg-[#E2E8F0]" />


          {/* =====================================================
              USER AVATAR
              No name / role displayed
          ===================================================== */}

          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-[#EFF6F3]
              text-[11px]
              font-bold
              text-[#0F4C42]
              ring-1
              ring-[#CDE1DA]
            "
            title={currentUser?.name || 'Marketplace User'}
          >
            {initials}
          </div>


          {/* =====================================================
              SIGN OUT
          ===================================================== */}

          <button
            type="button"
            onClick={handleLogout}
            className="
              inline-flex
              h-10
              items-center
              gap-2
              rounded-xl
              border
              border-red-200
              bg-white
              px-5
              text-[12px]
              font-semibold
              text-red-600
              transition-colors
              hover:bg-red-50
            "
          >

            <LogOut className="h-4 w-4" />

            <span>
              Sign Out
            </span>

          </button>

        </div>

      </div>


      {/* =========================================================
          MOBILE NAVIGATION
      ========================================================= */}

      <div className="flex overflow-x-auto border-t border-[#F1F5F9] px-4 lg:hidden">

        <NavLink
          to="/marketplace"
          end
          className={({ isActive }) =>
            `
              inline-flex
              h-12
              shrink-0
              items-center
              px-5
              text-[12px]
              font-semibold

              ${isActive
              ? 'border-b-2 border-[#0F4C42] text-[#0F4C42]'
              : 'text-[#64748B]'
            }
            `
          }
        >
          Home
        </NavLink>


        <NavLink
          to="/marketplace/medical"
          className={({ isActive }) =>
            `
              inline-flex
              h-12
              shrink-0
              items-center
              gap-2
              px-5
              text-[12px]
              font-semibold

              ${isActive
              ? 'border-b-2 border-[#0F4C42] text-[#0F4C42]'
              : 'text-[#64748B]'
            }
            `
          }
        >
          <Stethoscope className="h-4 w-4" />

          Medical Equipment
        </NavLink>


        <NavLink
          to="/marketplace/non-medical"
          className={({ isActive }) =>
            `
              inline-flex
              h-12
              shrink-0
              items-center
              gap-2
              px-5
              text-[12px]
              font-semibold

              ${isActive
              ? 'border-b-2 border-[#0F4C42] text-[#0F4C42]'
              : 'text-[#64748B]'
            }
            `
          }
        >
          <Building2 className="h-4 w-4" />

          Non-Medical Equipment
        </NavLink>

      </div>

    </header>
  );
}