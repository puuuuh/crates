export function decidePath(name: string) {
  name = name.toLowerCase();
  if (name.startsWith('"') && name.endsWith('"')) {
    name = name.substring(1, name.length - 1);
  }
  if (name.length === 1) {
    return `1/${name}`;
  }
  if (name.length === 2) {
    return `2/${name}`;
  }
  if (name.length === 3) {
    return `3/${name.charAt(0)}/${name}`;
  }

  return `${name.substring(0, 2)}/${name.substring(2, 4)}/${name}`;
}

export function decidePrefixPaths(prefix: string) {
  prefix = prefix.toLowerCase();
  if (prefix.startsWith('"') && prefix.endsWith('"')) {
    prefix = prefix.substring(1, prefix.length - 1);
  }
  const paths = [];
  if (prefix.length < 3) {
    paths.push(`3/`);
  }
  if (prefix.length < 2) {
    paths.push(`2/`);
  }
  if (prefix.length < 1) {
    paths.push(`1/`);
  }

  // We dont need to fetch full crates list, ig
  if (prefix.length < 2) {
    return paths;
  }

  const chunks = Math.trunc(prefix.length / 2);
  let longPath = "./"
  for (let i = 0; i < chunks; i++) {
    longPath += prefix.substr(i * 2, 2);
    longPath += "/"
  }
  paths.push(longPath)

  return paths;
}

export function parseVersions(response: string, name: string) {
  const conv = response.split("\n");
  console.log("Fetching DONE: ", name, conv.length);
  const versions = [];
  for (const rec of conv) {
    try {
      if (rec.trim().length > 0) {
        const parsed = JSON.parse(rec);
        versions.push({
          num: parsed.vers,
          yanked: parsed.yanked,
          features: Object.keys(parsed.features).filter(feature => feature !== "default").sort()
        });
      }
    } catch (er) {
      console.log(er, rec);
    }
  }
  return { versions: versions.sort().reverse() };
}