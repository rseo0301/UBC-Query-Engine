import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import * as JSZip from "jszip";
import * as fs from "fs-extra";
import {QueryValidation} from "./QueryValidation";
import {QueryProcessor} from "./QueryProcessor";
import AddDatasetParserHelper from "./addDatasetParserHelper";
/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

const parse5 = require("parse5");

export default class InsightFacade implements IInsightFacade {
    public datasetIDs: string[];             // list of datasetIDs used to return in addDataset
    public datasets: { [id: string]: any[]}; // saves an array of course data to turn into stringifyData
    private queryValidator: QueryValidation;
    private queryProcessor: QueryProcessor;
    public metadata: InsightDataset[];
    public courseData: any[] = [];
    public roomData: any[] = [];
    public roomNames: string[] = [];

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.datasetIDs = [];
        this.datasets = {};
        this.metadata = [];
        // TODO: add dataset into array in folder
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        if (kind === "rooms") {
            return this.addRoomDataset(id, content, kind);
        } else {
            return this.addCourseDataset(id, content, kind);
        }
    }

    private addCourseDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let zip = new JSZip();
        let courseData: any[] = [];
        let counter: number = 0;
        this.courseData = [];
        return new Promise<string[]>((resolve, reject) => {
            const valid = this.checkValidDataset(id);
            if (!valid) {
                reject(new InsightError());
            } else {
                zip.loadAsync(content, {base64: true}).then((zipContent) => {
                    if (zipContent.folder("courses") === null) {
                        reject(new InsightError("Courses folder does not exist"));
                    } else {
                        const futureFileContents: Array<Promise<string>> = [];
                        zip.folder("courses").forEach((relativePath, file) => {
                            futureFileContents.push(file.async("string"));
                        });
                        return Promise.all(futureFileContents).then((filledArray) => {
                            if (futureFileContents.length < 1) {
                                reject(new InsightError("There are no files"));
                            }
                            counter = this.pushCourseData(filledArray, counter);
                            if (counter === 0) {
                                reject(new InsightError("There are no valid sections"));
                            }
                            const stringifyData = JSON.stringify(this.courseData);
                            fs.writeFileSync("./data/" + id + ".txt", stringifyData);
                            this.datasets[id] = this.courseData;
                            const dataset: InsightDataset = {
                                id: id, kind: kind, numRows: counter
                            };
                            this.metadata.push(dataset);
                            resolve(this.returnDataset(id));
                        });
                    }
                }).catch(() => {
                    reject(new InsightError("Content is not a zip file"));
                });
            }
        });
    }

    private addRoomDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let zip = new JSZip();
        let counter: number = 0;
        let array: any[] = [];
        const futureFileContents: Array<Promise<any>> = [];

        return new Promise<string[]>((resolve, reject) => {
            const valid = this.checkValidDataset(id);
            if (!valid) {
                reject(new InsightError());
            } else {
                zip.loadAsync(content, {base64: true}).then((zipContent) => {
                    if (zipContent.folder("rooms") === null) {
                        reject(new InsightError("Rooms folder does not exist"));
                    } else {
                        return zip.file("rooms/index.htm").async("string").then(this.parseHTML).then((parsedData) => {
                            array = this.findRoomFileNames(parsedData);
                            for (let file of array) {
                                futureFileContents.push(zipContent.folder("rooms").file(file.substring(2))
                                    .async("string").then(this.parseHTML));
                            }
                        });
                    }
                }).then(() => {
                    return Promise.all(futureFileContents).then((filledArray) =>
                        this.pushRoomData(filledArray)).then((data) => {
                            if (futureFileContents.length < 1) {
                                reject(new InsightError("There are no files"));
                            }
                            counter = this.pushParsedRoomData(data, 0);
                            if (counter === 0) {
                                reject(new InsightError("There are no valid rooms"));
                            }
                            let stringifyData = JSON.stringify(this.roomData);
                            fs.writeFileSync("./data/" + id + ".txt", stringifyData);
                            this.datasets[id] = this.roomData;
                            const dataset: InsightDataset = {id: id, kind: kind, numRows: counter};
                            this.metadata.push(dataset);
                            resolve(this.returnDataset(id));
                        });
                    }).catch((e) => {
                        reject(new InsightError(e));
                    });
            }
        });
    }

    private pushParsedRoomData(arr: any[], counter: number): number {
        for (let item of arr) {
            if (item !== -1) {
                counter += item.length;
                for (let room of item) {
                    this.roomData.push(room);
                }
            }
        }
        return counter;
    }

    private findRoomFileNames(element: any): any[] {
        let array: string[] = [];
        if (element.nodeName === "tbody") {
            for (let child of element.childNodes) {
                if (child.nodeName === "tr") {
                    this.roomNames.push(child.childNodes[3].childNodes[0].value);
                    array.push(child.childNodes[5].childNodes[1].attrs[0].value);
                }
            }
            return array;
        }
        if (element.childNodes && element.childNodes.length > 0) {
            for (let child of element.childNodes) {
                let possibleArray = this.findRoomFileNames(child);
                if (possibleArray.length > 0) {
                    return possibleArray;
                }
            }
        }
        return [];
    }

    private parseHTML(html: string): Promise<any> {
        return Promise.resolve(parse5.parse(html));
    }

    private pushRoomData(arr: any[]): Promise<any[]> {
        let futureFileContent: Array<Promise<any>> = [];
        let counter = 0;
        for (let room of arr) {
            futureFileContent.push(this.pushIndividualRoomData(room, counter));
            counter++;
        }
        return Promise.all(futureFileContent);
    }

    private pushIndividualRoomData(room: any, index: number): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let x: any = AddDatasetParserHelper.filterRoomData(room, this.roomNames[index]);
            let url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team243/" +
                     x.address.replace(/\s/g, "%20");
            return AddDatasetParserHelper.getGeolocation(url).then((geo) => {
                let obj = AddDatasetParserHelper.finishFilterRoomData
                (x.element, this.roomNames[index], x.fullName, x.address, geo);
                resolve(obj);
            });
        });
    }

    private pushCourseData(arr: string[], counter: number) {
        arr.forEach((course) => {
            if (AddDatasetParserHelper.IsJsonString(course)) {
                let filteredData: any[] = AddDatasetParserHelper.filterKeys(course);
                counter += filteredData.length;
                for (let section of filteredData) {
                    this.courseData.push(section);
                }
            }
        });
        return counter;
    }

    private returnDataset(id: string) {
        this.datasetIDs.push(id);
        return this.datasetIDs;
    }

    private checkValidDataset(id: string): boolean {
        if (id === undefined || id === null) {
            return false;
        } else if (id.includes("_") || !id.replace(/\s/g, "").length) {
            return false;
        } else if (this.datasetIDs.includes(id)) {
            return false;
        } else {
            return true;
        }
        // TODO: reject if no valid dataset
    }

    public removeDataset(id: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            try {
                if (id.includes("_") || !id.replace(/\s/g, "").length) {
                    reject(new InsightError());
                }
                if (!this.datasetIDs.includes(id)) {
                    reject(new NotFoundError());
                } else {
                    const index = this.datasetIDs.indexOf(id);
                    delete this.datasets[id];
                    if (index > -1) {
                        this.datasetIDs.splice(index, 1);
                    }
                    try {
                        fs.unlinkSync("./data/" + id + ".txt");
                    } catch (err) {
                        reject(new InsightError("this one"));
                    }
                    resolve(id);
                }
            } catch (e) {
                reject(new InsightError(e));
            }
        });
    }

    public performQuery(query: any): Promise<any[]> {
        this.queryValidator = new QueryValidation(this.datasetIDs);
        if (query === null || query === undefined) {
            return Promise.reject(new InsightError("Invalid Query"));
        }
        if (!this.queryValidator.checkQueryValidity(query)) {
            return Promise.reject(new InsightError("Invalid Query"));
        }
        let currentDatasetID: any = this.queryValidator.idToQuery;
        this.queryProcessor = new QueryProcessor(this.datasets[currentDatasetID]);
        return this.queryProcessor.filterSections(query);
        // let query class handle result and result too large error
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return new Promise<InsightDataset[]>((resolve, reject) => {
            resolve(this.metadata);
        });
    }
}
