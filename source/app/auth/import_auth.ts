import { Auth } from "./auth";
import { isOfClassDeep } from "../types/Helper";
import { IO } from "../io/io";
import { readParseJSON } from "../file_system/file_system";

/**
 * @returns Auth object from `userdata/auth/auth.json` or empty Auth object if
 * not found or errored
 */
export function importAuthFromFile_impl(): Auth {
    let parse_result = readParseJSON(Auth.AUTH_PATH);
    if (parse_result.success === false) {
        IO.warn("ERROR: Could not import auth infos.");
        return new Auth();
    }
    let json_obj = parse_result.value;

    if (
        isOfClassDeep<Auth>(json_obj, new Auth(), {
            print: true,
            obj_name: "auth",
            add_missing_fields: true,
        }) === false
    ) {
        IO.warn("ERROR: Auth object failed to pass the sanity check.");
        return new Auth();
    }
    return json_obj as Auth;
}
