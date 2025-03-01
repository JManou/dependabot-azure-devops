import { IDependabotUpdate } from "../models/IDependabotUpdate";
import { load } from "js-yaml";
import * as fs from "fs";
import * as path from "path";
import { getVariable } from "azure-pipelines-task-lib/task";

/**
 * Parse the dependabot config YAML file to specify update(s) configuration
 *
 * The file should be located in '/.azuredevops/dependabot.yml' at the root of your repository
 *
 * To view YAML file format, visit
 * https://docs.github.com/en/github/administering-a-repository/configuration-options-for-dependency-updates#allow
 *
 * @returns {IDependabotUpdate[]} updates - array of dependency update configurations
 */
export default function parseConfigFile(): IDependabotUpdate[] {
  let rootDir = getVariable("Build.SourcesDirectory");
  var filePath = path.join(rootDir, "/.azuredevops/dependabot.yml");

  /*
   * If the file under the .azuredevops folder does not exist, check for one under the .github folder.
   * Advantage of using the file under .github is support for intellisense.
   */
  if (!fs.existsSync(filePath)) {
    filePath = path.join(rootDir, "/.github/dependabot.yml");
  }

  // Ensure we have the file. Otherwise throw a well readable error.
  if (!fs.existsSync(filePath)) {
    throw new Error("Configuration file not found at /.azuredevops/dependabot.yml or /.github/dependabot.yml");
  }

  let config: any;
  config = load(fs.readFileSync(filePath, "utf-8"));

  // Ensure the config object parsed is an object
  if (config === null || typeof config !== "object") {
    throw new Error("Invalid dependabot config object");
  }

  const rawVersion = config["version"];
  let version = -1;

  // Ensure the version has been specified
  if(!!!rawVersion) throw new Error("The version must be specified in dependabot.yml");

  // Try convert the version to integer
  try{
    version = parseInt(rawVersion, 10);
  }
  catch(e) {
    throw new Error("Dependabot version specified must be a valid integer");
  }

  // Ensure the version is == 2
  if(version !== 2) throw new Error("Only version 2 of dependabot is supported. Version specified: " + version);

  var updates: IDependabotUpdate[] = [];

  // Check the updates parsed
  var rawUpdates = config["updates"];

  // Check if the array of updates exists
  if (!Array.isArray(rawUpdates))
    throw new Error(
      "Invalid dependabot config object: Dependency updates config array not found"
    );

  // Parse the value of each of the updates obtained from the file
  rawUpdates.forEach((update) => {
    var dependabotUpdate: IDependabotUpdate = {
      packageEcosystem: update["package-ecosystem"],
      directory: update["directory"],

      openPullRequestLimit: update["open-pull-requests-limit"] || 5,

      targetBranch: update["target-branch"],
      versioningStrategy: update["versioning-strategy"],
      milestone: update["milestone"],

      // Convert to JSON and shorten the names as required by the script
      allow: update["allow"] ? JSON.stringify(update["allow"]) : undefined,
      ignore: update["ignore"] ? JSON.stringify(update["ignore"]) : undefined,
    };

    if (!dependabotUpdate.packageEcosystem) {
      throw new Error(
        "The value 'package-ecosystem' in dependency update config is missing"
      );
    }

    if (!dependabotUpdate.directory) {
      throw new Error(
        "The value 'directory' in dependency update config is missing"
      );
    }

    updates.push(dependabotUpdate);
  });

  return updates;
}
