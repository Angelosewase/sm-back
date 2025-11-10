import { Module } from "@nestjs/common";
import { MarksModule } from "src/marks/marks.module";
import { SchoolModule } from "src/school-module/school-module.module";
import { ReportsController } from "./reports.controller";

@Module({
    imports: [
        MarksModule,
        SchoolModule,
    ],
    controllers: [ReportsController],
    providers: [],
    exports: []
})
export class ReportsModule {}