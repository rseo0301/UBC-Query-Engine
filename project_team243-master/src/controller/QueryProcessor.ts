import {ResultTooLargeError} from "./IInsightFacade";
import {QueryFilterProcessor} from "./QueryFilterProcessor";
import {TransformationProcessor} from "./TransformationProcessor";
let mfield: string[] = ["avg", "pass", "fail", "audit", "year"];
let sfield: string[] = ["dept", "id", "instructor", "title", "uuid"];
let coursesFields: string[] = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"];
let roomsFields: string[] = ["fullname", "shortname", "number", "name",
    "address", "type", "furniture", "href", "lat", "lon", "seats"];

export class QueryProcessor {
    private addedData: any[];
    private queryResult: [];
    private queryFilterProcessor: QueryFilterProcessor;
    private transformationProcessor: TransformationProcessor;

    constructor(addedData: any) {
        this.addedData = addedData;
        this.queryResult = [];
    }

    private reformatData() {
        this.addedData.map(function (value) {
            if (typeof value["Year"] !== "undefined") {
                value["Year"] = Number(value["Year"]);
                return value;
            }
        });
        this.addedData.map(function (value) {
            if (typeof value["id"] !== "undefined") {
                value["id"] = value["id"].toString();
                return value;
            }
        });
        this.addedData.map(function (value) {
            if (typeof value["capacity"] !== "undefined") {
                value["capacity"] = Number(value["capacity"]);
                return value;
            }
        });
    }

    public filterSections(query: any): Promise<any[]> {
        this.queryFilterProcessor = new QueryFilterProcessor();
        this.transformationProcessor = new TransformationProcessor();
        let filteredSections: any[] = [];
        this.reformatData();
        for (let section of this.addedData) {
            if (this.queryFilterProcessor.applyFilter(query["WHERE"], section)) {
                filteredSections.push(section);
            }
        }
        if (filteredSections.length > 5000 && typeof query["TRANSFORMATIONS"] === "undefined") {
            return Promise.reject(new ResultTooLargeError("The result is too big"));
        } else if (filteredSections.length === 0) {
            return Promise.resolve([]);
        }
        let result: any;
        let groupedData: any;
        let appliedData: any;
        if (typeof query["TRANSFORMATIONS"] === "undefined") {
            result = this.applyOptions(query["OPTIONS"], filteredSections);
        } else {
            groupedData = this.transformationProcessor.applyTransformationsGroup(query["TRANSFORMATIONS"]["GROUP"],
                filteredSections);
            if (groupedData.length > 5000) {
                return Promise.reject(new ResultTooLargeError("The result is too big"));
            }
            // need to add apply method
            if (query["TRANSFORMATIONS"]["APPLY"].length !== 0) {
                this.transformationProcessor.applyTransformationsApply(query["TRANSFORMATIONS"]["APPLY"],
                    groupedData);
            }
            result = this.applyColumnsTransformation(query["OPTIONS"]["COLUMNS"], groupedData);
            result = this.applyOrderTransformation(query["OPTIONS"], result);

        }
        // console.log(result);
        return Promise.resolve(result);
    }

    private applyOptions(query: any, filteredSections: any[]) {
        let queryOptions: string[] = Object.keys(query);
        let filteredResult: any[] = this.applyColumns(query["COLUMNS"], filteredSections);
        if (queryOptions.length === 1) {
            return filteredResult;
        } else {
            if (typeof query["ORDER"] === "string") {
                return this.applyOrder(query["ORDER"], filteredResult);
            } else {
                return this.specialSort(query["ORDER"], filteredResult);
            }
        }
    }

    private applyOrderTransformation(query: any, filteredSections: any[]) {
        let queryOptions: string[] = Object.keys(query);
        if (queryOptions.length === 1) {
            return filteredSections;
        } else {
            if (typeof query["ORDER"] === "string") {
                return this.applyOrder(query["ORDER"], filteredSections);
            } else {
                return this.specialSort(query["ORDER"], filteredSections);
            }
        }
    }

    private applyColumns(query: any, filteredSections: any[]) {
        let filteredResult = filteredSections.map((value) => {
            let newSection: {[key: string]: any} = {};
            for (let filter of query) {
                let splitKey: string[] = filter.split("_");
                let field = splitKey[1];
                if (coursesFields.includes(field)) {
                    this.applyColumnsCourses(newSection, value, filter, field);
                } else if (roomsFields.includes(field)) {
                    this.applyColumnsRooms(newSection, value, filter, field);
                }
            }
            return newSection;
        });
        return filteredResult;
    }

    private applyColumnsTransformation(query: any, filteredSections: any[]) {
        let filteredResult = filteredSections.map((value) => {
            let newSection: {[key: string]: any} = {};
            for (let filter of query) {
                let splitKey: string[] = filter.split("_");
                let field = splitKey[1];
                if (coursesFields.includes(field)) {
                    this.applyColumnsCourses(newSection, value[0], filter, field);
                } else if (roomsFields.includes(field)) {
                    this.applyColumnsRooms(newSection, value[0], filter, field);
                } else {
                    this.applyColumnsApplyKey(newSection, value[0], filter);
                }
            }
            return newSection;
        });
        return filteredResult;
    }

    private applyColumnsApplyKey(newSection: any, storedSection: any, filter: any) {
        newSection[filter] = storedSection[filter];
    }

    private applyColumnsCourses(newSection: any, storedSection: any, filter: any, field: any) {
        switch (field) {
            case "dept":
                newSection[filter] = storedSection["Subject"];
                break;
            case "id":
                newSection[filter] = storedSection["Course"];
                break;
            case "instructor":
                newSection[filter] = storedSection["Professor"];
                break;
            case "title":
                newSection[filter] = storedSection["Title"];
                break;
            case "uuid":
                newSection[filter] = storedSection["id"].toString();
                break;
            case "avg":
                newSection[filter] = storedSection["Avg"];
                break;
            case "pass":
                newSection[filter] = storedSection["Pass"];
                break;
            case "fail":
                newSection[filter] = storedSection["Fail"];
                break;
            case "audit":
                newSection[filter] = storedSection["Audit"];
                break;
            case "year":
                newSection[filter] = Number(storedSection["Year"]);
                break;
        }
    }

    private applyColumnsRooms(newSection: any, storedSection: any, filter: any, field: any) {
        switch (field) {
            case "fullname":
                newSection[filter] = storedSection["fullName"];
                break;
            case "shortname":
                newSection[filter] = storedSection["shortName"];
                break;
            case "number":
                newSection[filter] = storedSection["roomNumber"];
                break;
            case "name":
                newSection[filter] = storedSection["name"];
                break;
            case "address":
                newSection[filter] = storedSection["address"];
                break;
            case "lat":
                newSection[filter] = storedSection["lat"];
                break;
            case "lon":
                newSection[filter] = storedSection["lon"];
                break;
            case "seats":
                newSection[filter] = storedSection["capacity"];
                break;
            case "type":
                newSection[filter] = storedSection["roomType"];
                break;
            case "furniture":
                newSection[filter] = storedSection["furniture"];
                break;
            case "href":
                newSection[filter] = storedSection["href"];
                break;
        }
    }

    // inspiration for sorting from https://stackoverflow.com/a/20554416
    private applyOrder(query: any, filteredResult: any[]): any[] {
        filteredResult.sort((a, b) => a[query] > b[query] ? 1 : -1);
        return filteredResult;
    }

    private specialSort(query: any, filteredResult: any[]): any[] {
        if (query["dir"] === "UP") {
            filteredResult.sort((a, b) => {
                for (let key of query["keys"]) {
                    if (a[key] === b[key]) {
                        continue;
                    } else {
                        return a[key] > b[key] ? 1 : -1;
                    }
                }
            });
        } else if (query["dir"] === "DOWN") {
            filteredResult.sort((a, b) => {
                for (let key of query["keys"]) {
                    if (a[key] === b[key]) {
                        continue;
                    } else {
                        return a[key] < b[key] ? 1 : -1;
                    }
                }
            });
        }
        return filteredResult;
    }
}
