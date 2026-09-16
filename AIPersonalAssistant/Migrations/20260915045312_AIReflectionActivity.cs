using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIPersonalAssistant.Migrations
{
    /// <inheritdoc />
    public partial class AIReflectionActivity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "IsCompleted",
                table: "ActivityLogs",
                newName: "RescheduleCount");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ReminderTime",
                table: "ActivityLogs",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "TEXT");

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "ActivityLogs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "ActivityLogs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "OriginalReminderTime",
                table: "ActivityLogs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResolutionSource",
                table: "ActivityLogs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "ActivityLogs",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$z5GiKsOsPLKtp4p6ApuO1eSqAubBNubWmViAJ9ZA9HpJ8B05U6VFe");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "ActivityLogs");

            migrationBuilder.DropColumn(
                name: "Note",
                table: "ActivityLogs");

            migrationBuilder.DropColumn(
                name: "OriginalReminderTime",
                table: "ActivityLogs");

            migrationBuilder.DropColumn(
                name: "ResolutionSource",
                table: "ActivityLogs");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "ActivityLogs");

            migrationBuilder.RenameColumn(
                name: "RescheduleCount",
                table: "ActivityLogs",
                newName: "IsCompleted");

            migrationBuilder.AlterColumn<DateTime>(
                name: "ReminderTime",
                table: "ActivityLogs",
                type: "TEXT",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$mbkLOWYiFFMI8OOTLr7KQO4QkxDM9kZp1RizBUI6dlGWSk3ty/nwK");
        }
    }
}
