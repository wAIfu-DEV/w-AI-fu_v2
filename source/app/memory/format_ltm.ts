import { QueryResult } from "./ltm_interface";

export function formatStampedMemory(memory: QueryResult): string {
    let curr_date = new Date();
    let mem_date = new Date(memory.timestamp);

    let time_frame: string = "(less than a minute ago) ";

    if (curr_date.getFullYear() !== mem_date.getFullYear()) {
        let year_difference = curr_date.getFullYear() - mem_date.getFullYear();
        time_frame = `(${year_difference} year${
            year_difference > 1 ? "s" : ""
        } ago) `;
    } else if (curr_date.getMonth() !== mem_date.getMonth()) {
        let month_difference = curr_date.getMonth() - mem_date.getMonth();
        time_frame = `(${month_difference} month${
            month_difference > 1 ? "s" : ""
        } ago) `;
    } else if (curr_date.getDate() !== mem_date.getDate()) {
        let day_difference = curr_date.getDate() - mem_date.getDate();
        time_frame = `(${day_difference} day${
            day_difference > 1 ? "s" : ""
        } ago) `;
    } else if (curr_date.getHours() !== mem_date.getHours()) {
        let hour_difference = curr_date.getHours() - mem_date.getHours();
        time_frame = `(${hour_difference} hour${
            hour_difference > 1 ? "s" : ""
        } ago) `;
    } else if (curr_date.getMinutes() !== mem_date.getMinutes()) {
        let min_difference = curr_date.getMinutes() - mem_date.getMinutes();
        time_frame = `(${min_difference} minute${
            min_difference > 1 ? "s" : ""
        } ago) `;
    }

    return time_frame + memory.content;
}
