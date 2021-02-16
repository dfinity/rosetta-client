{ sources ? import ./nix/sources.nix { }
, pkgsSrc ? sources.nixpkgs
, pkgs ? import pkgsSrc { }
, node ? "nodejs-15_x"
}: pkgs.mkShell {
  buildInputs = [
    pkgs."${node}"
  ];
}
