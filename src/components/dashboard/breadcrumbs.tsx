"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Route name mappings
const routeNames: Record<string, string> = {
  "": "Dashboard",
  "profiles": "Profiles",
  "posts": "Posts",
  "schedule": "Schedule",
  "admin": "Admin",
  "queue": "Queue",
  "new": "New Post",
  "edit": "Edit Post",
};

// Routes that should be hidden from breadcrumbs
const hiddenSegments = new Set(["(dashboard)", "(auth)"]);

export function DashboardBreadcrumbs() {
  const pathname = usePathname();

  // Split pathname into segments and filter out empty strings and hidden routes
  const segments = pathname
    .split("/")
    .filter((segment) => segment && !hiddenSegments.has(segment));

  // If we're on the root dashboard, show just Dashboard
  if (segments.length === 0 || pathname === "/") {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="flex items-center gap-1.5">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Build breadcrumb items
  const breadcrumbItems = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const isLast = index === segments.length - 1;

    // Check if segment is a UUID (post/profile ID)
    const isId = /^[a-zA-Z0-9_-]{20,}$/.test(segment);
    
    // Get display name
    let displayName = routeNames[segment] || segment;
    
    // Capitalize if not in routeNames
    if (!routeNames[segment] && !isId) {
      displayName = segment.charAt(0).toUpperCase() + segment.slice(1);
    }

    // If it's an ID, try to show a more friendly name
    if (isId) {
      // Check parent segment to determine type
      const parentSegment = index > 0 ? segments[index - 1] : "";
      if (parentSegment === "posts") {
        displayName = "Post Details";
      } else if (parentSegment === "profiles") {
        displayName = "Profile Details";
      } else {
        displayName = "Details";
      }
    }

    return {
      href,
      label: displayName,
      isLast,
    };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Home / Dashboard */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/" className="flex items-center gap-1.5">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbItems.map((item, index) => (
          <div key={item.href} className="flex items-center gap-1.5">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}






