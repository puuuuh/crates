// Please note that the internal structure of the Cargo home is not stabilized and may be subject to change at any time.
//
// Nevertheless, this api depends on there being a headless crates.io-index git repo at:
// CARGO_HOME/registry/index/github.com-1ecc6299db9ec823/.git/
// The repo isn"t updated, and is instead assumed to be updated by cargo reasonably recently.
//
// Furthermore, this api depends on "git" command being in PATH

import * as os from "os";
import * as path from "path";
import * as util from "util";
import * as fs from "fs";
import { decidePath, decidePrefixPaths, parseVersions } from "./index-utils";
const exec = util.promisify(require("child_process").exec);
const execSync = require("child_process").execSync;

// check for the crates index. If none found switch to github and show error
const cargoHome = getCargoPath();

function getCargoPath() {
  // Trailing slash on macos (does not want / at the end) and windows (needs / at end)
  if (process.env.CARGO_HOME)
    return process.env.CARGO_HOME;
  return path.resolve(os.homedir(), ".cargo/");
}

let gitDir = path.resolve(cargoHome, "registry/index/github.com-1ecc6299db9ec823/.git/");
let gitBranch = "origin/master";


export function checkCargoRegistry(localIndexHash?: string, localGitBranch?: string) {
  if (localIndexHash) {
    gitDir = path.resolve(cargoHome, `registry/index/${localIndexHash}/.git/`);
  }
  if (localGitBranch && localGitBranch.length > 0) {
    gitBranch = localGitBranch;
  } else {
    gitBranch = getDefaultBranch();
    // if no branch just check origin/HEAD or use origin/master for older versions
  }
  return fs.existsSync(gitDir);
}

export const versions = (name: string) => {
  return exec(
    `git --no-pager --git-dir="${gitDir}" show ${gitBranch}:${decidePath(name)}`,
    { maxBuffer: 8 * 1024 * 1024 }  // "8M ought to be enough for anyone."
  )
    .then((buf: { stdout: Buffer, stderr: Buffer; }) => {
      const response = buf.stdout.toString();
      return parseVersions(response, name);
    })
    .catch((resp: any) => {
      console.error(resp);
      throw resp;
    });
};

export const crates = (prefix: string) => {
  let commands = decidePrefixPaths(prefix).map((path) => 
    `git --no-pager --git-dir="${gitDir}" ls-tree -r --name-only ${gitBranch} "${path}"`)
  
  return exec(
    `{ ${commands.join(" & ")}; }`,
    { maxBuffer: 8 * 1024 * 1024 }  // "8M ought to be enough for anyone."
  )
    .then((buf: { stdout: Buffer, stderr: Buffer; }) => {
      const response = buf.stdout.toString();
      return response.split("\n").map((data) => {
        return data.substr(data.lastIndexOf('/') + 1)
      });
    })
    .catch((resp: any) => {
      console.error(resp);
      throw resp;
    });
};

export const getDefaultBranch = () => {
  try {
    const response = execSync(`git --no-pager --git-dir="${gitDir}" branch --all`, { maxBuffer: 8 * 1024 }).toString();
    const branches = response.split("\n").map((v: string) => v.replace("*", "").trim()).filter((v: string | any[]) => v.length > 0);
    const hasHead = branches.some((v: string) => v.endsWith("/HEAD"));
    if (hasHead)
      return "origin/HEAD";
    else
      return "origin/master";

  } catch (resp) {
    console.error(resp);
    return "origin/HEAD";
  };
};
