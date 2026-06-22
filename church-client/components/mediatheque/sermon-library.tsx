"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X, Check, Search, AlertCircle, ChevronDown, BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { type Sermon } from "@/lib/data";
import { SermonCard } from "@/components/cards/sermon-card";
import { BrandButton } from "@/components/ui/brand-button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

export const BIBLE_BOOKS = [
  // Ancien Testament
  "Genèse", "Exode", "Lévitique", "Nombres", "Deutéronome", "Josué", "Juges", "Ruth",
  "1 Samuel", "2 Samuel", "1 Rois", "2 Rois", "1 Chroniques", "2 Chroniques", "Esdras", "Néhémie",
  "Esther", "Job", "Psaumes", "Proverbes", "Ecclésiaste", "Cantique des Cantiques", "Ésaïe", "Jérémie",
  "Lamentations", "Ézéchiel", "Daniel", "Osée", "Joël", "Amos", "Abdias", "Jonas",
  "Michée", "Nahum", "Habaquq", "Sophonie", "Aggée", "Zacharie", "Malachie",
  // Nouveau Testament
  "Matthieu", "Marc", "Luc", "Jean", "Actes", "Romains", "1 Corinthiens", "2 Corinthiens",
  "Galates", "Éphésiens", "Philippiens", "Colossiens", "1 Thessaloniciens", "2 Thessaloniciens", "1 Timothée", "2 Timothée",
  "Tite", "Philémon", "Hébreux", "Jacques", "1 Pierre", "2 Pierre", "1 Jean", "2 Jean",
  "3 Jean", "Jude", "Apocalypse"
];

const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))];

export function SermonLibrary({ sermons }: { sermons: Sermon[] }) {
  const [isOpen, setIsOpen] = useState(false);

  // Filter States
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);

  // Book search inside MultiSelect
  const [bookSearch, setBookSearch] = useState("");
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);

  // Extract unique filter options from live data
  const seriesList = useMemo(() => uniq(sermons.map((s) => s.serie)), [sermons]);
  const speakersList = useMemo(() => uniq(sermons.map((s) => s.speaker)), [sermons]);

  // Filter Bible books to show only matches for search
  const filteredBibleBooks = useMemo(() => {
    return BIBLE_BOOKS.filter((b) =>
      b.toLowerCase().includes(bookSearch.toLowerCase())
    );
  }, [bookSearch]);

  // Apply filters in memory
  const filteredSermons = useMemo(() => {
    return sermons.filter((s) => {
      if (selectedSeries.length > 0 && !selectedSeries.includes(s.serie)) return false;
      if (selectedSpeakers.length > 0 && !selectedSpeakers.includes(s.speaker)) return false;
      if (selectedBooks.length > 0 && !selectedBooks.includes(s.book)) return false;
      return true;
    });
  }, [sermons, selectedSeries, selectedSpeakers, selectedBooks]);

  const handleToggleSeries = (serie: string) => {
    setSelectedSeries((prev) =>
      prev.includes(serie) ? prev.filter((x) => x !== serie) : [...prev, serie]
    );
  };

  const handleToggleSpeaker = (speaker: string) => {
    setSelectedSpeakers((prev) =>
      prev.includes(speaker) ? prev.filter((x) => x !== speaker) : [...prev, speaker]
    );
  };

  const handleToggleBook = (book: string) => {
    setSelectedBooks((prev) =>
      prev.includes(book) ? prev.filter((x) => x !== book) : [...prev, book]
    );
  };

  const handleResetFilters = () => {
    setSelectedSeries([]);
    setSelectedSpeakers([]);
    setSelectedBooks([]);
    setBookSearch("");
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Results summary */}
        <div className="text-[13px] font-semibold text-body-strong">
          {filteredSermons.length} message(s) trouvé(s)
          {(selectedSeries.length > 0 || selectedSpeakers.length > 0 || selectedBooks.length > 0) && (
            <span className="ml-1 text-gold-dark font-bold">
              (filtres actifs)
            </span>
          )}
        </div>

        {/* Trigger Button for Advanced Sheet */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="flex cursor-pointer items-center gap-2 rounded-xl border border-[rgba(40,25,80,0.12)] bg-white px-5 py-3 text-xs font-bold text-indigo hover:border-gold hover:bg-cream/40 transition">
              <SlidersHorizontal className="size-4 text-gold-dark" />
              Filtres avancés
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[90vw] sm:max-w-md border-none bg-cream p-6 overflow-y-auto">
            <SheetHeader className="text-left border-b border-[rgba(40,25,80,0.06)] pb-4 mb-5">
              <SheetTitle className="font-display text-xl font-bold text-indigo italic">
                Filtres de recherche
              </SheetTitle>
              <SheetDescription className="text-xs text-body">
                Affinez le catalogue de sermons de l&apos;Église en direct.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              {/* Canonical MultiSelect for Bible Books */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold tracking-wider text-indigo uppercase">
                  Livres de la Bible
                </label>
                <div className="relative">
                  {/* Select button */}
                  <button
                    type="button"
                    onClick={() => setIsBookDropdownOpen(!isBookDropdownOpen)}
                    className="flex w-full items-center justify-between rounded-xl border border-[rgba(40,25,80,0.12)] bg-white px-4 py-3 text-left text-xs font-bold text-indigo outline-none focus:border-gold"
                  >
                    <span className="truncate">
                      {selectedBooks.length === 0
                        ? "Sélectionner des livres (66 canoniques)"
                        : `${selectedBooks.length} livre(s) sélectionné(s)`}
                    </span>
                    <ChevronDown className="size-4 text-faint" />
                  </button>

                  {/* Dropdown Menu */}
                  {isBookDropdownOpen && (
                    <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-[rgba(40,25,80,0.08)] bg-white p-3.5 shadow-xl animate-in fade-in slide-in-from-top-1.5 duration-200">
                      {/* Search box */}
                      <div className="flex items-center gap-2 rounded-lg border border-[rgba(40,25,80,0.1)] bg-cream px-2.5 py-1.5 text-xs mb-3">
                        <Search className="size-3.5 text-faint" />
                        <input
                          type="text"
                          placeholder="Rechercher un livre..."
                          value={bookSearch}
                          onChange={(e) => setBookSearch(e.target.value)}
                          className="w-full text-xs text-indigo outline-none placeholder:text-faint bg-transparent border-none"
                        />
                        {bookSearch && (
                          <button type="button" onClick={() => setBookSearch("")}>
                            <X className="size-3.5 text-faint" />
                          </button>
                        )}
                      </div>

                      {/* Options listing */}
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1.5">
                        {filteredBibleBooks.map((book) => {
                          const isChecked = selectedBooks.includes(book);
                          return (
                            <button
                              type="button"
                              key={book}
                              onClick={() => handleToggleBook(book)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition text-left",
                                isChecked ? "bg-cream text-indigo font-bold" : "text-body-strong hover:bg-cream/40"
                              )}
                            >
                              <span>{book}</span>
                              {isChecked && <Check className="size-3.5 text-gold-dark" />}
                            </button>
                          );
                        })}

                        {filteredBibleBooks.length === 0 && (
                          <div className="py-4 text-center text-xs text-faint">
                            Aucun livre trouvé.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected book badges */}
                {selectedBooks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-24 overflow-y-auto">
                    {selectedBooks.map((book) => (
                      <span
                        key={book}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo/5 border border-indigo-mid/10 px-2.5 py-1 text-[10.5px] font-bold text-indigo"
                      >
                        {book}
                        <button
                          type="button"
                          onClick={() => handleToggleBook(book)}
                          className="text-indigo-mid hover:text-live"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Series filters */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold tracking-wider text-indigo uppercase">
                  Séries de Messages
                </label>
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {seriesList.map((serie) => {
                    const isChecked = selectedSeries.includes(serie);
                    return (
                      <label
                        key={serie}
                        className="flex cursor-pointer items-center justify-between rounded-xl border border-[rgba(40,25,80,0.06)] bg-white px-3.5 py-2.5 text-xs font-bold text-indigo transition hover:border-gold"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSeries(serie)}
                            className="size-3.5 accent-gold cursor-pointer"
                          />
                          {serie}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Speakers filters */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold tracking-wider text-indigo uppercase">
                  Orateurs / Prédicateurs
                </label>
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {speakersList.map((speaker) => {
                    const isChecked = selectedSpeakers.includes(speaker);
                    return (
                      <label
                        key={speaker}
                        className="flex cursor-pointer items-center justify-between rounded-xl border border-[rgba(40,25,80,0.06)] bg-white px-3.5 py-2.5 text-xs font-bold text-indigo transition hover:border-gold"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSpeaker(speaker)}
                            className="size-3.5 accent-gold cursor-pointer"
                          />
                          {speaker}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex gap-3 border-t border-[rgba(40,25,80,0.06)] pt-6">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 cursor-pointer rounded-xl border border-[rgba(40,25,80,0.12)] bg-white py-3 text-xs font-bold text-indigo hover:bg-cream transition"
              >
                Réinitialiser
              </button>
              <SheetClose asChild>
                <button
                  type="button"
                  className="flex-1 cursor-pointer rounded-xl bg-gradient-to-br from-gold to-gold-dark py-3 text-xs font-bold text-indigo hover:brightness-105 transition"
                >
                  Appliquer
                </button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Sermons display grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-[22px]">
        {filteredSermons.map((s) => (
          <SermonCard key={s.title} sermon={s} />
        ))}
      </div>

      {filteredSermons.length === 0 && (
        <div className="py-20 text-center rounded-[24px] border border-dashed border-[rgba(40,25,80,0.12)] bg-white">
          <BookOpen className="size-8 text-faint mx-auto mb-3" />
          <h3 className="font-display text-sm font-bold text-indigo">Aucun sermon trouvé</h3>
          <p className="text-xs text-body mt-1">Essayez de réinitialiser vos filtres ou d&apos;élargir vos termes de recherche.</p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 rounded-xl bg-cream px-4 py-2 text-xs font-bold text-indigo hover:bg-gold/10 transition"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </>
  );
}
