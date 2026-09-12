import React, { useState } from "react";
import {
  Collapse,
  Navbar,
  NavbarBrand,
  NavbarToggler,
  NavItem,
  NavLink,
} from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./NavMenu.css";

export function NavMenu() {
  const [collapsed, setCollapsed] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleNavbar = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header>
      <Navbar
        className="navbar-expand-sm navbar-toggleable-sm ng-white border-bottom box-shadow mb-3"
        container
        light
      >
        <NavbarBrand tag={Link} to="/">
          AI Personal Assistant
        </NavbarBrand>
        <NavbarToggler onClick={toggleNavbar} className="mr-2" />
        <Collapse
          className="d-sm-inline-flex flex-sm-row-reverse"
          isOpen={!collapsed}
          navbar
        >
          <ul className="navbar-nav flex-grow align-items-center">
            <NavItem>
              <NavLink tag={Link} className="text-dark" to="/">
                Home
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink tag={Link} className="text-dark" to="/counter">
                Counter
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink tag={Link} className="text-dark" to="/fetch-data">
                Fetch data
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink tag={Link} className="text-dark" to="/activity">
                Activity
              </NavLink>
            </NavItem>
            {user?.role === "Admin" && (
              <NavItem>
                <NavLink tag={Link} className="text-dark" to="/logs">
                  API Logs
                </NavLink>
              </NavItem>
            )}

            {user && (
              <li className="nav-item ms-auto d-flex align-items-center">
                <span className="text-muted me-3 small">
                  👤 {user.fullName || user.email} ({user.role || "User"})
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-sm btn-outline-danger"
                >
                  Logout
                </button>
              </li>
            )}
          </ul>
        </Collapse>
      </Navbar>
    </header>
  );
}
