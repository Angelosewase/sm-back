import { Module } from "@nestjs/common";
import { ClassesModule } from "src/classes/classes.module";
import { StudentsModule } from "src/students/students.module";
import { DashboardController } from "./analytics.controller";

@Module({
    imports:[
        StudentsModule,
        ClassesModule
    ],
    controllers: [DashboardController],
    providers:[],
    exports: []
})

export class AnalyticsModule {}