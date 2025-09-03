import { Building2, GraduationCap } from "lucide-react";

const DSBAHeader = () => {
  return (
    <header className="w-full bg-dsba-header shadow-dsba-elevation">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* DSBA Logo Placeholder */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-primary-foreground">
                Dayananda Sagar Institutions (DSI)
              </h1>
              <h2 className="text-lg font-semibold text-primary-foreground/90">
                Dayananda Sagar Business Academy (DSBA)
              </h2>
            </div>
          </div>

          {/* Institutional Recognition Text */}
          <div className="hidden lg:flex flex-col items-center text-center max-w-2xl">
            <p className="text-sm text-primary-foreground/95 font-medium">
              Recognised by the Government of Karnataka
            </p>
            <p className="text-sm text-primary-foreground/90">
              Permanently Affiliated to Bangalore University & Approved by A.I.C.T.E.
            </p>
            <p className="text-sm text-primary-foreground/90">
              Accredited by NAAC
            </p>
          </div>

          {/* IQ Logo Placeholder */}
          <div className="flex items-center space-x-3">
            <div className="flex flex-col items-end">
              <h3 className="text-lg font-bold text-primary-foreground">
                IQ
              </h3>
              <p className="text-sm text-primary-foreground/90">
                Assessment Portal
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Mobile Recognition Text */}
        <div className="lg:hidden mt-4 text-center">
          <p className="text-sm text-primary-foreground/95 font-medium">
            Recognised by the Government of Karnataka, Permanently Affiliated to Bangalore University & Approved by A.I.C.T.E., Accredited by NAAC
          </p>
        </div>
      </div>
    </header>
  );
};

export default DSBAHeader;