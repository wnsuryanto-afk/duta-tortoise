import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

/**
 * TabsList — bisa digeser mendatar bila tab-nya tidak muat.
 *
 * Bawaannya `inline-flex` tanpa jalan keluar apa pun saat isinya lebih lebar
 * dari layar. Label Indonesia panjang-panjang ("Semua Transaksi", "Pengeluaran",
 * "Pengaturan"), dan di ponsel 390px deretan itu mendorong SELURUH HALAMAN
 * melebar — bukan cuma tabnya. Diukur pada lebar ponsel:
 *
 *     Laporan Keuangan   isi 676px  →  halaman meleset 286px ke samping
 *     Daftar Kura        isi 569px  →  179px
 *     Penjualan          isi 420px  →   30px
 *     Gudang             isi 409px  →   19px
 *
 * Akibatnya seluruh halaman bisa digeser ke kanan, judul ikut bergeser keluar
 * layar, dan tombol di tepi kanan tidak bisa dijangkau tanpa menggeser dulu.
 *
 * `overflow-x-auto` menahan lebarnya di dalam deretan tab itu sendiri:
 * halamannya diam, tabnya yang digeser. `scrollbar-none` menyembunyikan
 * batangnya di ponsel — geser dengan jari sudah cukup — dan `max-w-full`
 * mencegah `inline-flex` melar melewati induknya.
 */
const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 max-w-full items-center justify-start overflow-x-auto scrollbar-none rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props} />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className
    )}
    {...props} />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
