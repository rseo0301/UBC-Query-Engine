import Decimal from "decimal.js";
let coursesFields: string[] = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"];
let roomsFields: string[] = ["fullname", "shortname", "number", "name",
    "address", "type", "furniture", "href", "lat", "lon", "seats"];

export class TransformationProcessor {

    public applyTransformationsGroup(query: any, data: any): any[] {
        // Help from https://codereview.stackexchange.com/a/37132
        function grouping(array: any[], keys: any) {
            let newGroup: any = {};
            array.forEach(function (e) {
                let group = keys(e);
                if (!newGroup[group]) {
                    newGroup[group] = [];
                }
                newGroup[group].push(e);
            });
            return Object.keys(newGroup).map((group) => {
                return newGroup[group];
            });
        }

        let returnArray = grouping(data, (key: any) => {
            return this.groupkeyHelper(query, key);
        });
        return returnArray;
    }

    private groupkeyHelper(query: any, data: any) {
        let returnArr: any[] = [];
        for (let key of query) {
            let field: string = key.split("_")[1];
            let groupValue: any;
            if (coursesFields.includes(field)) {
                groupValue = this.groupingConvertCourses(field, data);
            } else {
                groupValue = this.groupingConvertRooms(field, data);
            }
            returnArr.push(groupValue);
        }
        return returnArr;
    }

    private groupingConvertCourses(field: any, data: any) {
        let groupValue: any;
        switch (field) {
            case "dept":
                groupValue = data["Subject"];
                break;
            case "id":
                groupValue = data["Course"];
                break;
            case "instructor":
                groupValue = data["Professor"];
                break;
            case "title":
                groupValue = data["Title"];
                break;
            case "uuid":
                groupValue = data["id"];
                break;
            case "avg":
                groupValue = data["Avg"];
                break;
            case "pass":
                groupValue = data["Pass"];
                break;
            case "fail":
                groupValue = data["Fail"];
                break;
            case "audit":
                groupValue = data["Audit"];
                break;
            case "year":
                groupValue = data["Year"];
                break;
        }
        return groupValue;
    }

    private groupingConvertRooms(field: any, data: any) {
        let groupValue: any;
        switch (field) {
            case "fullname":
                groupValue = data["fullName"];
                break;
            case "shortname":
                groupValue = data["shortName"];
                break;
            case "number":
                groupValue = data["roomNumber"];
                break;
            case "name":
                groupValue = data["name"];
                break;
            case "address":
                groupValue = data["address"];
                break;
            case "lat":
                groupValue = data["lat"];
                break;
            case "lon":
                groupValue = data["lon"];
                break;
            case "seats":
                groupValue = data["capacity"];
                break;
            case "type":
                groupValue = data["roomType"];
                break;
            case "furniture":
                groupValue = data["furniture"];
                break;
            case "href":
                groupValue = data["href"];
                break;
        }
        return groupValue;
    }

    public applyTransformationsApply(keys: any, groupedData: any) {
        for (let applyRule of keys) {
            let applyKey: any = Object.keys(applyRule)[0];
            let token: any = Object.keys(applyRule[applyKey])[0];
            let key: any = applyRule[applyKey][token];
            for (let group of groupedData) {
                let appliedValue: any;
                if (token === "AVG") {
                    appliedValue = this.applyAvg(key, group);
                } else if (token === "MIN") {
                    appliedValue = this.applyMin(key, group);
                } else if (token === "MAX") {
                    appliedValue = this.applyMax(key, group);
                } else if (token === "COUNT") {
                    appliedValue = this.applyCount(key, group);
                } else {
                    appliedValue = this.applySum(key, group);
                }
                for (let section of group) {
                    section[applyKey] = appliedValue;
                }
            }
        }
    }

    private applyAvg(key: any, group: any) {
        let total = new Decimal(0);
        let field: string = key.split("_")[1];
        field = this.fieldConverter(field);
        for (let section of group) {
            let value: any = new Decimal(section[field]);
            total = total.add(value);
        }
        let avg = total.toNumber() / group.length;
        let returnVal = Number(avg.toFixed(2));
        return returnVal;
    }

    private applyMin(key: any, group: any) {
        let min = Number.POSITIVE_INFINITY;
        let field: string = key.split("_")[1];
        field = this.fieldConverter(field);
        for (let section of group) {
            let temp = section[field];
            if (temp < min) {
                min = temp;
            }
        }
        return min;
    }

    private applyMax(key: any, group: any) {
        let max = Number.NEGATIVE_INFINITY;
        let field: string = key.split("_")[1];
        field = this.fieldConverter(field);
        for (let section of group) {
            let temp = section[field];
            if (temp > max) {
                max = temp;
            }
        }
        return max;
    }

    private applySum(key: any, group: any) {
        let total = new Decimal(0);
        let field: string = key.split("_")[1];
        field = this.fieldConverter(field);
        for (let section of group) {
            let value: any = new Decimal(section[field]);
            total = total.add(value);
        }
        let returnVal = Number(total.toFixed(2));
        return returnVal;
    }

    // Help from https://stackoverflow.com/questions/44960867/using-reduce-on-an-a-list-of-objects/44960951
    private applyCount(key: any, group: any) {
        let field: string = key.split("_")[1];
        field = this.fieldConverter(field);
        let returnVal = group.reduce((countObj: any, section: any) => {
            if (!countObj[section[field]]) {
                countObj[section[field]] = 0;
            }
            countObj[section[field]]++;
            return countObj;
        }, {});
        return Object.keys(returnVal).length;
    }

    private fieldConverter(field: any): string {
        let returnField: string;
        if (coursesFields.includes(field)) {
            returnField = this.convertCoursesFields(field);
        } else {
            returnField = this.convertRoomsFields(field);
        }
        return returnField;
    }

    private convertCoursesFields(field: any): string {
        let returnField: string;
        switch (field) {
            case "dept":
                returnField = "Subject";
                break;
            case "id":
                returnField = "Course";
                break;
            case "instructor":
                returnField = "Professor";
                break;
            case "title":
                returnField = "Title";
                break;
            case "uuid":
                returnField = "id";
                break;
            case "avg":
                returnField = "Avg";
                break;
            case "pass":
                returnField = "Pass";
                break;
            case "fail":
                returnField = "Fail";
                break;
            case "audit":
                returnField = "Audit";
                break;
            case "year":
                returnField = "Year";
                break;
        }
        return returnField;
    }

    private convertRoomsFields(field: any): string {
        let returnField: string;
        switch (field) {
            case "fullname":
                returnField = "fullName";
                break;
            case "shortname":
                returnField = "shortName";
                break;
            case "number":
                returnField = "roomNumber";
                break;
            case "name":
                returnField = "name";
                break;
            case "address":
                returnField = "address";
                break;
            case "lat":
                returnField = "lat";
                break;
            case "lon":
                returnField = "lon";
                break;
            case "seats":
                returnField = "capacity";
                break;
            case "type":
                returnField = "roomType";
                break;
            case "furniture":
                returnField = "furniture";
                break;
            case "href":
                returnField = "href";
                break;
        }
        return returnField;
    }
}
