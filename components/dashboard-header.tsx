"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Settings, Shield, Wallet, Menu, X } from "lucide-react"

export function DashboardHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary glow-blue" />
              <span className="text-xl font-bold text-foreground">DAGShield</span>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Network Active
            </Badge>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Button variant="ghost" size="sm">
              Dashboard
            </Button>
            <Button variant="ghost" size="sm">
              Nodes
            </Button>
            <Button variant="ghost" size="sm">
              Analytics
            </Button>
            <Button variant="ghost" size="sm">
              Rewards
            </Button>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-destructive">3</Badge>
            </Button>

            <Button variant="outline" size="sm" className="hidden sm:flex items-center space-x-2 bg-transparent">
              <Wallet className="h-4 w-4" />
              <span>0x1234...5678</span>
            </Button>

            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <nav className="flex flex-col space-y-2">
              <Button variant="ghost" size="sm" className="justify-start">
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" className="justify-start">
                Nodes
              </Button>
              <Button variant="ghost" size="sm" className="justify-start">
                Analytics
              </Button>
              <Button variant="ghost" size="sm" className="justify-start">
                Rewards
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
