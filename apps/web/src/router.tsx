import type { ComponentType } from "react";
import {
  Outlet,
  createBrowserRouter,
  isRouteErrorResponse,
  useLocation,
  useNavigate,
  useRouteError,
} from "react-router";
import { ErrorState } from "@/components/common/feedback/error-state";
import RootNotFound from "@/app/not-found";
import MemberNotFound from "@/app/(member)/not-found";
import StaffNotFound from "@/app/staff/not-found";
import { queryClient } from "@/lib/spa/query";
import { NewTrainingVisitProvider } from "@/components/trainings/new-training-visit";
import { AdminGate, MemberGate, StaffGate } from "@/src/routes/gates";
import { HomeRoute } from "@/src/routes/home";
import { LoginRoute } from "@/src/routes/login";

function TrainingLibraryLayout() {
  return (
    <NewTrainingVisitProvider>
      <Outlet />
    </NewTrainingVisitProvider>
  );
}

function page(load: () => Promise<{ default: ComponentType }>) {
  return async () => ({ Component: (await load()).default });
}

function RouteError({ home }: { home: string }) {
  const error = useRouteError();
  const navigate = useNavigate();
  const location = useLocation();
  if (isRouteErrorResponse(error) && error.status === 404) {
    if (home === "/staff/hoy") return <StaffNotFound />;
    if (home === "/calendario") return <MemberNotFound />;
    return <RootNotFound />;
  }
  return (
    <ErrorState
      reset={() => {
        void queryClient.invalidateQueries();
        void navigate(`${location.pathname}${location.search}`, { replace: true });
      }}
      home={home}
    />
  );
}

const devRoutes = import.meta.env.DEV
  ? [
      { path: "dev/access-fixture", lazy: page(() => import("@/app/dev/access-fixture/page")) },
      { path: "dev/component-composition", lazy: page(() => import("@/app/dev/component-composition/page")) },
      { path: "dev/members", lazy: page(() => import("@/app/dev/members/page")) },
    ]
  : [];

export function createAppRouter(Root: ComponentType) {
  return createBrowserRouter([
    {
      Component: Root,
      children: [
        { index: true, Component: HomeRoute },
        { path: "login", Component: LoginRoute },
        ...devRoutes,
        {
          Component: MemberGate,
          errorElement: <RouteError home="/calendario" />,
          children: [
            { path: "calendario", lazy: page(() => import("@/app/(member)/calendario/page")) },
            { path: "reservas", lazy: page(() => import("@/app/(member)/reservas/page")) },
            { path: "historial", lazy: page(() => import("@/app/(member)/historial/page")) },
            { path: "biblioteca", lazy: page(() => import("@/app/(member)/biblioteca/page")) },
            { path: "biblioteca/:id", lazy: page(() => import("@/app/(member)/biblioteca/[id]/page")) },
            { path: "tarifa", lazy: page(() => import("@/app/(member)/tarifa/page")) },
            { path: "cuenta", lazy: page(() => import("@/app/(member)/cuenta/page")) },
            { path: "clases/:id", lazy: page(() => import("@/app/(member)/clases/[id]/page")) },
            { path: "*", Component: MemberNotFound },
          ],
        },
        {
          path: "staff",
          Component: StaffGate,
          errorElement: <RouteError home="/staff/hoy" />,
          children: [
            { path: "hoy", lazy: page(() => import("@/app/staff/hoy/page")) },
            { path: "semana", lazy: page(() => import("@/app/staff/semana/page")) },
            { path: "excepciones", lazy: page(() => import("@/app/staff/excepciones/page")) },
            { path: "clases/:id", lazy: page(() => import("@/app/staff/clases/[id]/page")) },
            { path: "perfil", lazy: page(() => import("@/app/staff/perfil/page")) },
            { path: "socios", lazy: page(() => import("@/app/staff/socios/page")) },
            { path: "socios/:id", lazy: page(() => import("@/app/staff/socios/[id]/page")) },
            { path: "socios/:id/pagos", lazy: page(() => import("@/app/staff/socios/[id]/pagos/page")) },
            { path: "impagos", lazy: page(() => import("@/app/staff/impagos/page")) },
            { path: "cobros", lazy: page(() => import("@/app/staff/cobros/page")) },
            {
              path: "biblioteca",
              Component: TrainingLibraryLayout,
              children: [
                { index: true, lazy: page(() => import("@/app/staff/biblioteca/page")) },
                { path: "nuevo", lazy: page(() => import("@/app/staff/biblioteca/nuevo/page")) },
                { path: ":id", lazy: page(() => import("@/app/staff/biblioteca/[id]/page")) },
                { path: ":id/editar", lazy: page(() => import("@/app/staff/biblioteca/[id]/editar/page")) },
              ],
            },
            { path: "plantilla", lazy: page(() => import("@/app/staff/plantilla/page")) },
            {
              Component: AdminGate,
              children: [
                { path: "equipo", lazy: page(() => import("@/app/staff/equipo/page")) },
                { path: "equipo/:id", lazy: page(() => import("@/app/staff/equipo/[id]/page")) },
                { path: "boxes", lazy: page(() => import("@/app/staff/boxes/page")) },
                { path: "tipos", lazy: page(() => import("@/app/staff/tipos/page")) },
                { path: "horario", lazy: page(() => import("@/app/staff/horario/page")) },
                { path: "tarifas", lazy: page(() => import("@/app/staff/tarifas/page")) },
              ],
            },
            { path: "*", Component: StaffNotFound },
          ],
        },
        { path: "*", Component: RootNotFound },
      ],
    },
  ]);
}
