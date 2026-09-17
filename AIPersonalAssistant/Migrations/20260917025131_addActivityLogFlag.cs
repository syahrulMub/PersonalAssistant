using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIPersonalAssistant.Migrations
{
    /// <inheritdoc />
    public partial class addActivityLogFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "MemorySyncedAt",
                table: "ActivityLogs",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "ActivityLogs",
                type: "TEXT",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$KVH1c7eCVUm48wxuBF/EYebGljD0WIiGDtWtkF78H6KLMgVC.B4fO");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MemorySyncedAt",
                table: "ActivityLogs");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "ActivityLogs");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$6oxMfDVwCeUxiPzw0757d.3eDNJ6j4mCPMbiRxfV.kDsQdnrqD5dG");
        }
    }
}
