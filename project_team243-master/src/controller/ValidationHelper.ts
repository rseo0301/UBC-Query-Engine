let coursesFields: string[] = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"];
let roomsFields: string[] = ["fullname", "shortname", "number", "name",
    "address", "type", "furniture", "href", "lat", "lon", "seats"];

export class ValidationHelper {
    public checkFromOnlyOneSet(keys: string[]): boolean {
        let isRooms = keys.every((key: string) => roomsFields.includes(key.split("_")[1]));
        let isCourses = keys.every((key: string) => coursesFields.includes(key.split("_")[1]));
        return (isRooms !== isCourses);
    }
}
