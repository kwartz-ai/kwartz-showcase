"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Kbd } from "@/components/atoms/pill";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface SearchEntry {
  href: string;
  title: string;
  group: string;
  hint?: string;
}

/** Every word typed must be in the entry. A match in the title ranks first. */
function match(value: string, search: string) {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const all = value.toLowerCase();
  if (!words.every((w) => all.includes(w))) return 0;
  const title = all.split(" | ")[0] ?? "";
  return words.every((w) => title.includes(w)) ? 1 : 0.5;
}

/** Search across every doc, guide and theme. Opens with Ctrl K or the button. */
export function SearchBox({
  entries,
  className,
  hotkey = false,
}: {
  entries: SearchEntry[];
  className?: string;
  /** Only one search box on a page should answer Ctrl K. */
  hotkey?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!hotkey) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkey]);

  const groups = [...new Set(entries.map((e) => e.group))];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "clay-pressed flex w-full cursor-pointer items-center gap-2 rounded-2xl px-3 py-2.5 text-sm whitespace-nowrap text-muted-foreground",
          className,
        )}
      >
        <Search className="size-4" />
        Search
        <Kbd className="ml-auto whitespace-nowrap">Ctrl K</Kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search the docs"
        description="Find a doc, a guide or a theme"
      >
        <Command filter={match}>
          <CommandInput placeholder="Search docs, guides and themes" />
          <CommandList>
            <CommandEmpty>Nothing found.</CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g} heading={g}>
                {entries
                  .filter((e) => e.group === g)
                  .map((e) => (
                    <CommandItem
                      key={e.href}
                      value={`${e.title} | ${e.hint ?? ""}`}
                      onSelect={() => {
                        setOpen(false);
                        router.push(e.href);
                      }}
                    >
                      {e.title}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
