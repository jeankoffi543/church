"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Flame, Users, MapPin, Phone, HelpCircle, BookOpen, Video, Image as ImageIcon, Calendar, Quote, ShoppingBag } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { BrandButton } from "@/components/ui/brand-button";
import { LiveDot } from "@/components/ui/live-dot";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string; icon?: React.ReactNode }
>(({ className, title, children, icon, ...props }, ref) => {
  const pathname = usePathname();
  const isActive = pathname === props.href;

  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-xl p-3.5 leading-none no-underline outline-none transition-all duration-200 hover:bg-cream hover:text-indigo focus:bg-cream focus:text-indigo",
            isActive ? "bg-cream text-indigo border-l-2 border-gold-dark pl-3 rounded-l-none shadow-sm shadow-gold-dark/5" : "",
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-2">
            {icon && <span className={cn("shrink-0", isActive ? "text-gold-dark" : "text-gold-dark/70")}>{icon}</span>}
            <div className={cn("text-[13.5px] font-bold text-indigo leading-none", isActive ? "underline decoration-gold-dark decoration-2 underline-offset-4" : "")}>{title}</div>
          </div>
          <p className="line-clamp-2 text-xs leading-relaxed text-body mt-1.5 pl-6">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkLive = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${apiUrl}/public/settings?group=live`, {
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          setIsLive(Boolean(json.data?.live_status));
        }
      } catch {
        // fail silently
      }
    };
    checkLive();
    const interval = setInterval(checkLive, 15000);
    return () => clearInterval(interval);
  }, []);

  // Determine active parent items
  const isEgliseActive = pathname.startsWith("/eglise") || pathname === "/branches";
  const isCommunauteActive = pathname === "/groupes-de-maison" || pathname === "/ministeres";
  const isMediathequeActive = pathname.startsWith("/mediatheque") || pathname === "/lives-archives" || pathname === "/galerie";

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-6">
        <Logo />

        {/* Desktop navigation */}
        <nav className="hidden lg:flex">
          <NavigationMenu>
            <NavigationMenuList className="gap-1">

              {/* Menu L'Église */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className={cn(isEgliseActive ? "text-indigo border-b-2 border-gold-dark rounded-b-none" : "")}>
                  L&apos;Église
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[380px] gap-1.5 p-4 md:w-[460px] md:grid-cols-1">
                    <ListItem
                      href="/eglise"
                      title="Notre Vision & Équipe"
                      icon={<Flame className="size-4" />}
                    >
                      Découvrez notre confession de foi, notre vision spirituelle et l&apos;équipe pastoral.
                    </ListItem>
                    <ListItem
                      href="/eglise#mot-du-pasteur"
                      title="Le Mot du Pasteur"
                      icon={<Quote className="size-4" />}
                    >
                      Découvrez le message d&apos;accueil, d&apos;exhortation et la vision spirituelle du Pasteur.
                    </ListItem>
                    <ListItem
                      href="/branches"
                      title="Nos branches"
                      icon={<MapPin className="size-4" />}
                    >
                      Trouvez le lieu de culte ou le campus MFM Ficgayo le plus proche de chez vous.
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Menu Communauté */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className={cn(isCommunauteActive ? "text-indigo border-b-2 border-gold-dark rounded-b-none" : "")}>
                  Communauté
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[380px] gap-1.5 p-4 md:w-[460px] md:grid-cols-1">
                    <ListItem
                      href="/groupes-de-maison"
                      title="Groupes de Maison (Cellules)"
                      icon={<Users className="size-4" />}
                    >
                      Rejoignez une cellule de prière de quartier en semaine pour grandir ensemble dans la communion fraternelle.
                    </ListItem>
                    <ListItem
                      href="/ministeres"
                      title="Nos Ministères & Départements"
                      icon={<HelpCircle className="size-4" />}
                    >
                      Découvrez nos ministères (Enfants, Jeunesse, Louange, Intercession) et postulez pour servir.
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Menu Médiathèque */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className={cn(isMediathequeActive ? "text-indigo border-b-2 border-gold-dark rounded-b-none" : "")}>
                  Médiathèque
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[380px] gap-1.5 p-4 md:w-[460px] md:grid-cols-1">
                    <ListItem
                      href="/mediatheque"
                      title="Sermons & Messages"
                      icon={<BookOpen className="size-4" />}
                    >
                      Réécoutez nos enseignements bibliques filtrés par thèmes, orateurs et livres de la Bible.
                    </ListItem>
                    <ListItem
                      href="/lives-archives"
                      title="VOD & Archives Cultes"
                      icon={<Video className="size-4" />}
                    >
                      Parcourez les rediffusions vidéo de nos cultes et de nos grands événements passés.
                    </ListItem>
                    <ListItem
                      href="/galerie"
                      title="Galerie Photos"
                      icon={<ImageIcon className="size-4" />}
                    >
                      Visualisez la vie de l&apos;église, les moments forts de nos cultes et séminaires en images.
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Lien Direct Agenda */}
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/agenda" className={cn(navigationMenuTriggerStyle(), pathname === "/agenda" ? "text-indigo border-b-2 border-gold-dark rounded-b-none" : "")}>
                    <Calendar className="size-4 mr-1.5 inline text-gold-dark" />
                    Agenda
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              {/* Lien Direct Contact */}
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/contact" className={cn(navigationMenuTriggerStyle(), pathname === "/contact" ? "text-indigo border-b-2 border-gold-dark rounded-b-none" : "")}>
                    <Phone className="size-4 mr-1.5 inline text-gold-dark" />
                    Contact
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              {/* Lien Direct Boutique */}
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/store" className={cn(navigationMenuTriggerStyle(), pathname.startsWith("/store") ? "text-indigo border-b-2 border-gold-dark rounded-b-none" : "")}>
                    <ShoppingBag className="size-4 mr-1.5 inline text-gold-dark" />
                    Boutique
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isLive ? (
            <BrandButton asChild variant="live" size="sm">
              <Link href="/live">
                <LiveDot className="size-2" />
                EN DIRECT
              </Link>
            </BrandButton>
          ) : (
            <Link
              href="/live"
              className="flex items-center gap-2 rounded-[9px] border border-[rgba(40,25,80,0.12)] bg-white/50 px-3.5 py-2 text-[13px] font-bold text-body-strong transition hover:bg-white/80"
            >
              <span className="size-2 rounded-full bg-body/40" />
              HORS LIGNE
            </Link>
          )}
          <BrandButton asChild variant="gold" size="sm">
            <Link href="/dons">Donner</Link>
          </BrandButton>
        </div>

        {/* Mobile actions */}
        <div className="ml-auto flex items-center gap-2.5 lg:hidden">
          {isLive ? (
            <BrandButton asChild variant="live" size="sm" className="px-3 py-2">
              <Link href="/live">
                <LiveDot className="size-1.5" />
                LIVE
              </Link>
            </BrandButton>
          ) : (
            <Link
              href="/live"
              className="flex items-center gap-1.5 rounded-[9px] border border-[rgba(40,25,80,0.12)] bg-white/50 px-3 py-2 text-[11px] font-bold text-body-strong transition hover:bg-white/80"
            >
              <span className="size-1.5 rounded-full bg-body/40" />
              HORS LIGNE
            </Link>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="flex size-[42px] items-center justify-center rounded-[10px] border border-[rgba(40,25,80,0.12)] bg-white text-indigo"
              aria-label="Ouvrir le menu"
            >
              <Menu className="size-[18px]" />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[min(82vw,330px)] gap-0 border-none bg-cream p-6 overflow-y-auto"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <nav className="mt-8 flex flex-col gap-6">

                <div>
                  <h4 className="text-[10px] font-bold tracking-wider text-gold-dark uppercase mb-2">L&apos;Église</h4>
                  <div className="flex flex-col gap-2.5 pl-2">
                    <SheetClose asChild>
                      <Link href="/eglise" className={cn("text-[15px] font-bold", pathname === "/eglise" ? "text-gold-dark underline decoration-2 underline-offset-4" : "text-indigo")}>Notre Vision & Équipe</Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/eglise#mot-du-pasteur" className={cn("text-[15px] font-bold", pathname === "/eglise" && typeof window !== "undefined" && window.location.hash === "#mot-du-pasteur" ? "text-gold-dark underline decoration-2 underline-offset-4" : "text-indigo")}>Le Mot du Pasteur</Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/branches" className={cn("text-[15px] font-bold", pathname === "/branches" ? "text-gold-dark underline decoration-2 underline-offset-4" : "text-indigo")}>Nos branches</Link>
                    </SheetClose>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold tracking-wider text-gold-dark uppercase mb-2">Communauté</h4>
                  <div className="flex flex-col gap-2.5 pl-2">
                    <SheetClose asChild>
                      <Link href="/groupes-de-maison" className={cn("text-[15px] font-bold", pathname === "/groupes-de-maison" ? "text-gold-dark underline decoration-2 underline-offset-4" : "text-indigo")}>Groupes de maison</Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/ministeres" className={cn("text-[15px] font-bold", pathname === "/ministeres" ? "text-gold-dark underline decoration-2 underline-offset-4" : "text-indigo")}>Nos Ministères</Link>
                    </SheetClose>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold tracking-wider text-gold-dark uppercase mb-2">Médiathèque</h4>
                  <div className="flex flex-col gap-2.5 pl-2">
                    <SheetClose asChild>
                      <Link href="/mediatheque" className={cn("text-[15px] font-bold", pathname.startsWith("/mediatheque") ? "text-gold-dark underline decoration-2 underline-offset-4" : "text-indigo")}>Sermons & Messages</Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/lives-archives" className={cn("text-[15px] font-bold", pathname === "/lives-archives" ? "text-gold-dark underline decoration-2 underline-offset-4" : "text-indigo")}>VOD & Archives Cultes</Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/galerie" className={cn("text-[15px] font-bold", pathname === "/galerie" ? "text-gold-dark underline decoration-2 underline-offset-4" : "text-indigo")}>Galerie Photos</Link>
                    </SheetClose>
                  </div>
                </div>

                <div className="pt-2 border-t border-[rgba(40,25,80,0.08)] flex flex-col gap-4">
                  <SheetClose asChild>
                    <Link href="/agenda" className={cn("text-lg font-bold italic flex items-center gap-1.5", pathname === "/agenda" ? "text-gold-dark underline decoration-2 underline-offset-4" : "text-indigo")}>
                      <Calendar className="size-4.5 text-gold-dark" />
                      Agenda complet
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/contact" className={cn("text-lg font-bold italic flex items-center gap-1.5", pathname === "/contact" ? "text-gold-dark underline decoration-2 underline-offset-4" : "text-indigo")}>
                      <Phone className="size-4.5 text-gold-dark" />
                      Nous contacter
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/store" className={cn("text-lg font-bold italic flex items-center gap-1.5", pathname.startsWith("/store") ? "text-gold-dark underline decoration-2 underline-offset-4" : "text-indigo")}>
                      <ShoppingBag className="size-4.5 text-gold-dark" />
                      Boutique
                    </Link>
                  </SheetClose>
                </div>

                <SheetClose asChild>
                  <BrandButton asChild variant="gold" size="full" className="mt-2">
                    <Link href="/dons">Faire un don</Link>
                  </BrandButton>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

